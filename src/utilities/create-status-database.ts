import { Level } from 'level'

import { Progress } from '../types'

export type StatusDatabase = {
  deleteAllIncompleteAsync: () => Promise<void>
  getStatusAsync: (type: string, id: string) => Promise<null | Result>
  setStatusToQueuedAsync: (type: string, id: string) => Promise<void>
  setStatusToInProgressAsync: (
    type: string,
    id: string,
    progress: Progress
  ) => Promise<void>
  setStatusToDoneAsync: (type: string, id: string) => Promise<void>
}

type Result = {
  images: Array<Image>
  resultEndpoint: string
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE'
}
type Image = {
  url: string
  progress: number
}

const levelDbOptions = { valueEncoding: 'json' }

export function createStatusDatabase(directoryPath: string): StatusDatabase {
  const db = new Level(directoryPath)

  async function deleteAllIncompleteAsync(): Promise<void> {
    const deleteOperations: Array<{ type: 'del'; key: string }> = []
    for await (const [key, result] of db.iterator<string, Result>(
      levelDbOptions
    )) {
      if (result.status !== 'COMPLETE') {
        deleteOperations.push({ key, type: 'del' })
      }
    }
    db.batch(deleteOperations)
  }

  async function getStatusAsync(
    type: string,
    id: string
  ): Promise<null | Result> {
    try {
      const key = createKey(type, id)
      const result: null | Result = await db.get(key, levelDbOptions)
      return result
    } catch (error: any) {
      return null
    }
  }

  async function setStatusToQueuedAsync(
    type: string,
    id: string
  ): Promise<void> {
    const key = createKey(type, id)
    return db.put(
      key,
      {
        images: [],
        resultEndpoint: `${type}/${id}`,
        status: 'QUEUED'
      },
      levelDbOptions
    )
  }

  async function setStatusToInProgressAsync(
    type: string,
    id: string,
    { currentSample, progress, totalSamples }: Progress
  ): Promise<void> {
    const key = createKey(type, id)
    const result: null | Result = await db.get(key, levelDbOptions)
    if (result === null) {
      throw new Error('`status` is `null`')
    }
    result.status = 'IN_PROGRESS'
    if (result.images.length === 0) {
      let i = 0
      while (i < totalSamples) {
        result.images.push({
          progress: 0,
          url: `${type}/${id}/${i + 1}.png`
        })
        i += 1
      }
    }
    result.images[currentSample - 1].progress = progress
    return db.put(key, result, levelDbOptions)
  }

  async function setStatusToDoneAsync(type: string, id: string): Promise<void> {
    const key = createKey(type, id)
    const result: null | Result = await db.get(key, levelDbOptions)
    if (result === null) {
      throw new Error('`status` is `null`')
    }
    result.status = 'COMPLETE'
    return db.put(key, result, levelDbOptions)
  }

  return {
    deleteAllIncompleteAsync,
    getStatusAsync,
    setStatusToDoneAsync,
    setStatusToInProgressAsync,
    setStatusToQueuedAsync
  }
}

function createKey(type: string, id: string) {
  return `${type}-${id}`
}
