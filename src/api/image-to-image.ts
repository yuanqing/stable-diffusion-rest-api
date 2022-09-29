import EventEmitter from 'node:events'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ImageToImageOptions } from '../types.js'
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
  'image-to-image.py'
)

export function imageToImage(
  prompt: string,
  imageFilePath: string,
  options: ImageToImageOptions = {}
): EventEmitter {
  const parsedOptions = parseImageToImageOptions(options)
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
      imageFilePath: resolve(imageFilePath),
      prompt
    },
    scriptFilePath: SCRIPT_FILE_PATH,
    stableDiffusionRepositoryDirectoryPath
  })
}

function parseImageToImageOptions(
  options: ImageToImageOptions
): Required<ImageToImageOptions> {
  return {
    batchSize: typeof options.batchSize === 'undefined' ? 1 : options.batchSize,
    eta: typeof options.eta === 'undefined' ? 0 : options.eta,
    guidanceScale:
      typeof options.guidanceScale === 'undefined'
        ? 7.5
        : options.guidanceScale,
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
    steps: typeof options.steps === 'undefined' ? 24 : options.steps,
    strength: typeof options.strength === 'undefined' ? 0.75 : options.strength
  }
}
