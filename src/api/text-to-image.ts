import EventEmitter from 'node:events'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TextToImageOptions } from '../types.js'
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_CHANNELS,
  DEFAULT_DOWNSAMPLING_FACTOR,
  DEFAULT_ETA,
  DEFAULT_GUIDANCE_SCALE,
  DEFAULT_HEIGHT,
  DEFAULT_ITERATIONS,
  DEFAULT_MODEL_FILE_PATH_TEXT_TO_IMAGE,
  DEFAULT_OUTPUT_DIRECTORY_PATH,
  DEFAULT_SEED,
  DEFAULT_STABLE_DIFFUSION_REPOSITORY_DIRECTORY_PATH,
  DEFAULT_STEPS_TEXT_TO_IMAGE,
  DEFAULT_WIDTH
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
    batchSize:
      typeof options.batchSize === 'undefined'
        ? DEFAULT_BATCH_SIZE
        : options.batchSize,
    channels:
      typeof options.channels === 'undefined'
        ? DEFAULT_CHANNELS
        : options.channels,
    downsamplingFactor:
      typeof options.downsamplingFactor === 'undefined'
        ? DEFAULT_DOWNSAMPLING_FACTOR
        : options.downsamplingFactor,
    eta: typeof options.eta === 'undefined' ? DEFAULT_ETA : options.eta,
    guidanceScale:
      typeof options.guidanceScale === 'undefined'
        ? DEFAULT_GUIDANCE_SCALE
        : options.guidanceScale,
    height:
      typeof options.height === 'undefined' ? DEFAULT_HEIGHT : options.height,
    iterations:
      typeof options.iterations === 'undefined'
        ? DEFAULT_ITERATIONS
        : options.iterations,
    modelFilePath:
      typeof options.modelFilePath === 'undefined'
        ? DEFAULT_MODEL_FILE_PATH_TEXT_TO_IMAGE
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
    steps:
      typeof options.steps === 'undefined'
        ? DEFAULT_STEPS_TEXT_TO_IMAGE
        : options.steps,
    width: typeof options.width === 'undefined' ? DEFAULT_WIDTH : options.width
  }
}
