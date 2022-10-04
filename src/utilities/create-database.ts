import { Level } from 'level'

import {
  CompleteResponse,
  InProgressResponse,
  Progress,
  QueuedResponse,
  RestApiResponse
} from '../types'

export type Database = {
  deleteIncompleteJobsAsync: () => Promise<void>
  getJobStatusAsync: (
    type: string,
    id: string
  ) => Promise<null | RestApiResponse>
  setJobStatusToQueuedAsync: (type: string, id: string) => Promise<void>
  setJobStatusToInProgressAsync: (
    type: string,
    id: string,
    progress: Progress
  ) => Promise<void>
  setJobStatusToDoneAsync: (type: string, id: string) => Promise<void>
}

const levelDbOptions = { valueEncoding: 'json' }

export function createDatabase(directoryPath: string): Database {
  const db = new Level(directoryPath)

  async function deleteIncompleteJobsAsync(): Promise<void> {
    const deleteOperations: Array<{ type: 'del'; key: string }> = []
    for await (const [key, result] of db.iterator<string, RestApiResponse>(
      levelDbOptions
    )) {
      if (result.status !== 'COMPLETE') {
        deleteOperations.push({ key, type: 'del' })
      }
    }
    db.batch(deleteOperations)
  }

  async function getJobStatusAsync(
    type: string,
    id: string
  ): Promise<null | RestApiResponse> {
    try {
      const key = createKey(type, id)
      const result: null | RestApiResponse = await db.get(key, levelDbOptions)
      return result
    } catch (error: any) {
      return null
    }
  }

  async function setJobStatusToQueuedAsync(
    type: string,
    id: string
  ): Promise<void> {
    const result: null | RestApiResponse = await getJobStatusAsync(type, id)
    if (result !== null) {
      throw new Error('`result` must be `null`')
    }
    const key = createKey(type, id)
    const value: QueuedResponse = {
      resultUrl: `${type}/${id}`,
      status: 'QUEUED'
    }
    return db.put(key, value, levelDbOptions)
  }

  async function setJobStatusToInProgressAsync(
    type: string,
    id: string,
    progress: Progress
  ): Promise<void> {
    const result: null | RestApiResponse = await getJobStatusAsync(type, id)
    if (result === null) {
      throw new Error('`result` is `null`')
    }
    if (result.status === 'COMPLETE') {
      throw new Error("`result` cannot be 'COMPLETE'")
    }
    const imageUrls: Array<string> = []
    const completedImages =
      progress.currentImageProgress === 1
        ? progress.currentImageIndex
        : Math.max(0, progress.currentImageIndex - 1)
    let i = 0
    while (i < completedImages) {
      imageUrls.push(`${type}/${id}/${i + 1}.png`)
      i += 1
    }
    const key = createKey(type, id)
    const value: InProgressResponse = {
      imageUrls,
      progress,
      resultUrl: result.resultUrl,
      status: 'IN_PROGRESS'
    }
    return db.put(key, value, levelDbOptions)
  }

  async function setJobStatusToDoneAsync(
    type: string,
    id: string
  ): Promise<void> {
    const result: null | RestApiResponse = await getJobStatusAsync(type, id)
    if (result === null) {
      throw new Error('`result` is `null`')
    }
    if (result.status !== 'IN_PROGRESS') {
      throw new Error("`result` must be 'IN_PROGRESS'")
    }
    const key = createKey(type, id)
    const value: CompleteResponse = {
      imageUrls: result.imageUrls,
      resultUrl: result.resultUrl,
      status: 'COMPLETE'
    }
    return db.put(key, value, levelDbOptions)
  }

  return {
    deleteIncompleteJobsAsync,
    getJobStatusAsync,
    setJobStatusToDoneAsync,
    setJobStatusToInProgressAsync,
    setJobStatusToQueuedAsync
  }
}

function createKey(type: string, id: string) {
  return `${type}/${id}`
}
