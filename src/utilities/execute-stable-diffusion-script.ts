import fs from 'fs-extra'
import mem from 'mem'
import { spawn } from 'node:child_process'
import EventEmitter from 'node:events'
import { join, resolve } from 'node:path'
import pWaitFor from 'p-wait-for'
import { snakeCase } from 'snake-case'

import { Progress } from '../types.js'

const POLL_INTERVAL = 200
const ITERATION_PREFIX_REGEX = /Sampling:/

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
    model: modelFileAbsolutePath,
    output: outputDirectoryAbsolutePath
  })}`

  const emitProgress = mem(
    function (progress: Progress) {
      eventEmitter.emit('progress', progress)
    },
    {
      cacheKey: function ([{ currentSample, progress, totalSamples }]: [
        Progress
      ]) {
        return `${currentSample}/${totalSamples}}-${progress.toFixed(2)}`
      }
    }
  )

  let currentSample = -1
  let totalSamples = -1

  const stderr: Array<string> = []

  const pythonProcess = spawn(command, { shell: true })
  pythonProcess.stderr.on('data', async function (data: Buffer): Promise<void> {
    const lines = data.toString().split('\n')
    for (const line of lines) {
      stderr.push(line)
      if (ITERATION_PREFIX_REGEX.test(line) === true) {
        const split = line.split('|')
        const matches = split[2].trim().match(/^(\d+)\/(\d+)/)
        if (matches === null) {
          continue
        }
        if (matches[1] === matches[2]) {
          continue
        }
        currentSample = parseInt(matches[1], 10) + 1
        if (totalSamples === -1) {
          totalSamples = parseInt(matches[2], 10)
        }
        emitProgress({ currentSample, progress: 0, totalSamples })
      }
      if (/(Sampler|Decoding image):/.test(line) === true) {
        if (currentSample === -1) {
          eventEmitter.emit(
            'error',
            new Error('`currentSample` is `undefined`')
          )
          return
        }
        if (totalSamples === -1) {
          eventEmitter.emit('error', new Error('`totalSamples` is `undefined`'))
          return
        }
        const split = line.split('|')
        const matches = split[0].trim().match(/: +(\d+)%/)
        if (matches === null) {
          continue
        }
        const progress = parseInt(matches[1], 10) / 100
        ;(async function ({ currentSample, totalSamples, progress }: Progress) {
          if (progress === 1) {
            // Ensure that image file exists on disk before updating the status
            const outputImageAbsolutePath = join(
              outputDirectoryAbsolutePath,
              `${currentSample}.png`
            )
            await pWaitFor(
              function () {
                return fs.pathExists(outputImageAbsolutePath)
              },
              { interval: POLL_INTERVAL }
            )
          }
          emitProgress({ currentSample, progress, totalSamples })
        })({ currentSample, progress, totalSamples })
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
