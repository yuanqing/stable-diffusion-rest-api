import EventEmitter from 'node:events'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TextToImageOptions } from '../types.js'
import {
  DEFAULT_OUTPUT_DIRECTORY_PATH,
  DEFAULT_SEED,
  DEFAULT_STABLE_DIFFUSION_REPOSITORY_DIRECTORY_PATH,
  DEFAULT_TEXT_TO_IMAGE_MODEL_FILE_PATH
} from '../utilities/constants.js'
import { executeStableDiffusionScript } from '../utilities/execute-stable-diffusion-script.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT_FILE_PATH = resolve(
  __dirname,
  '..',
  'stable-diffusion-scripts',
  'text-to-image.py'
)

export function textToImage(
  prompt: string,
  options: TextToImageOptions = {}
): EventEmitter {
  const parsedOptions = parseTextToImageOptions(options)
  const {
    modelFilePath,
    outputDirectoryPath,
    stableDiffusionRepositoryDirectoryPath,
    ...scriptArgs
  } = parsedOptions
  return executeStableDiffusionScript({
    modelFilePath,
    outputDirectoryPath,
    scriptArgs: {
      ...scriptArgs,
      prompt
    },
    scriptFilePath: SCRIPT_FILE_PATH,
    stableDiffusionRepositoryDirectoryPath
  })
}

function parseTextToImageOptions(
  options: TextToImageOptions
): Required<TextToImageOptions> {
  return {
    batchSize: typeof options.batchSize === 'undefined' ? 1 : options.batchSize,
    channels: typeof options.channels === 'undefined' ? 4 : options.channels,
    downsamplingFactor:
      typeof options.downsamplingFactor === 'undefined'
        ? 8
        : options.downsamplingFactor,
    eta: typeof options.eta === 'undefined' ? 0 : options.eta,
    guidanceScale:
      typeof options.guidanceScale === 'undefined'
        ? 7.5
        : options.guidanceScale,
    height: typeof options.height === 'undefined' ? 512 : options.height,
    iterations:
      typeof options.iterations === 'undefined' ? 1 : options.iterations,
    modelFilePath:
      typeof options.modelFilePath === 'undefined'
        ? DEFAULT_TEXT_TO_IMAGE_MODEL_FILE_PATH
        : options.modelFilePath,
    outputDirectoryPath:
      typeof options.outputDirectoryPath === 'undefined'
        ? DEFAULT_OUTPUT_DIRECTORY_PATH
        : options.outputDirectoryPath,
    seed: typeof options.seed === 'undefined' ? DEFAULT_SEED : options.seed,
    stableDiffusionRepositoryDirectoryPath:
      typeof options.stableDiffusionRepositoryDirectoryPath === 'undefined'
        ? DEFAULT_STABLE_DIFFUSION_REPOSITORY_DIRECTORY_PATH
        : options.stableDiffusionRepositoryDirectoryPath,
    steps: typeof options.steps === 'undefined' ? 8 : options.steps,
    width: typeof options.width === 'undefined' ? 512 : options.width
  }
}
