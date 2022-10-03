import fs from 'fs-extra'
import { spawn } from 'node:child_process'
import EventEmitter from 'node:events'
import { join, resolve } from 'node:path'
import pWaitFor from 'p-wait-for'
import { snakeCase } from 'snake-case'

import { Progress } from '../types.js'

const POLLING_INTERVAL = 200
const LOG_PREFIX_REGEX = /Sampling:/

export function executeStableDiffusionScript(options: {
  modelFilePath: string
  outputDirectoryPath: string
  scriptArgs: Record<string, boolean | string | number>
  scriptFilePath: string
  stableDiffusionRepositoryDirectoryPath: string
}): EventEmitter {
  const {
    modelFilePath,
    outputDirectoryPath,
    scriptArgs,
    scriptFilePath,
    stableDiffusionRepositoryDirectoryPath
  } = options

  const outputDirectoryAbsolutePath = resolve(outputDirectoryPath)
  const stableDiffusionRepositoryDirectoryAbsolutePath = resolve(
    stableDiffusionRepositoryDirectoryPath
  )
  const venvDirectoryAbsolutePath = join(
    stableDiffusionRepositoryDirectoryAbsolutePath,
    'venv'
  )
  const modelFileAbsolutePath = resolve(modelFilePath)

  const eventEmitter = new EventEmitter()

  const command = `cd ${stableDiffusionRepositoryDirectoryAbsolutePath} && \
  VIRTUAL_ENV="${venvDirectoryAbsolutePath}" \
  PATH="$VIRTUAL_ENV/bin:$PATH" \
  PYTHONPATH="${stableDiffusionRepositoryDirectoryAbsolutePath}:$PYTHONPATH" \
  python '${scriptFilePath}' \
  ${createScriptArgs({
    ...scriptArgs,
    modelFilePath: modelFileAbsolutePath,
    outputDirectoryPath: outputDirectoryAbsolutePath
  })}`

  let emitProgress:
    | null
    | ((currentImageIndex: number, currentImageProgress: number) => void) = null
  let currentImageIndex: null | number = -1

  const stderr: Array<string> = []

  const pythonProcess = spawn(command, { shell: true })
  pythonProcess.stderr.on('data', async function (data: Buffer): Promise<void> {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      stderr.push(line)
      if (LOG_PREFIX_REGEX.test(line) === true) {
        const split = line.split('|')
        const matches = split[2].trim().match(/^(\d+)\/(\d+)/)
        if (matches === null) {
          continue
        }
        if (matches[1] === matches[2]) {
          continue
        }
        currentImageIndex = parseInt(matches[1], 10) + 1
        if (emitProgress === null) {
          const totalImages = parseInt(matches[2], 10)
          emitProgress = emitProgressFactory(
            totalImages,
            function (progress: Progress) {
              eventEmitter.emit('progress', progress)
            }
          )
        }
        emitProgress(currentImageIndex, 0)
      }
      if (/(Sampler|Decoding image):/.test(line) === true) {
        if (currentImageIndex === null) {
          eventEmitter.emit('error', new Error('`currentImageIndex` is `null`'))
          return
        }
        const split = line.split('|')
        const matches = split[0].trim().match(/: +(\d+)%/)
        if (matches === null) {
          continue
        }
        const currentImageProgress = parseInt(matches[1], 10) / 100
        ;(async function (
          currentImageIndex: number,
          currentImageProgress: number
        ) {
          if (emitProgress === null) {
            throw new Error('`emitProgress` is null')
          }
          if (currentImageProgress === 1) {
            // Ensure that image file exists on disk
            const outputImageAbsolutePath = join(
              outputDirectoryAbsolutePath,
              `${currentImageIndex}.png`
            )
            await pWaitFor(
              function () {
                return fs.pathExists(outputImageAbsolutePath)
              },
              { interval: POLLING_INTERVAL }
            )
          }
          emitProgress(currentImageIndex, currentImageProgress)
        })(currentImageIndex, currentImageProgress)
      }
    }
  })
  pythonProcess.on('exit', function (code: number): void {
    if (code === 0) {
      eventEmitter.emit('done')
      return
    }
    eventEmitter.emit(
      'error',
      new Error(
        `'${scriptFilePath}' exited with code ${code}\n${stderr.join('\n')}`
      )
    )
  })

  return eventEmitter
}

function createScriptArgs(args: Record<string, boolean | string | number>) {
  const result: Array<string> = []
  for (const key in args) {
    const value = args[key]
    if (value === false) {
      continue
    }
    result.push(`--${snakeCase(key)}`)
    if (typeof value === 'string') {
      result.push(`"${value}"`)
      continue
    }
    if (typeof value === 'number') {
      result.push(`${value}`)
    }
  }
  return result.join(' ')
}

function emitProgressFactory(
  totalImages: number,
  emitProgress: (progress: Progress) => void
) {
  let index = 1
  const seen: Record<string, true> = {}
  let backlog: Array<{
    currentImageIndex: number
    currentImageProgress: number
  }> = []
  return function (currentImageIndex: number, currentImageProgress: number) {
    const key = `${currentImageIndex}-${currentImageProgress}`
    if (seen[key] === true) {
      return
    }
    seen[key] = true
    if (currentImageIndex === index) {
      emitProgress({ currentImageIndex, currentImageProgress, totalImages })
      if (currentImageProgress !== 1) {
        return
      }
      if (backlog.length > 0) {
        backlog.sort(function (x, y) {
          if (x.currentImageIndex !== y.currentImageIndex) {
            return x.currentImageIndex - y.currentImageIndex
          }
          return x.currentImageProgress - y.currentImageProgress
        })
        for (const { currentImageIndex, currentImageProgress } of backlog) {
          emitProgress({ currentImageIndex, currentImageProgress, totalImages })
          seen[key] = true
        }
        backlog = []
      }
      index += 1
      return
    }
    if (currentImageIndex > index) {
      backlog.push({ currentImageIndex, currentImageProgress })
    }
  }
}
