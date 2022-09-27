import EventEmitter from 'node:events'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ImageToImageOptions } from '../types.js'
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
      image: imageFilePath,
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
    ddimEta: typeof options.ddimEta === 'undefined' ? 0 : options.ddimEta,
    ddimSteps:
      typeof options.ddimSteps === 'undefined' ? 24 : options.ddimSteps,
    guidanceScale:
      typeof options.guidanceScale === 'undefined'
        ? 7.5
        : options.guidanceScale,
    iterations:
      typeof options.iterations === 'undefined' ? 1 : options.iterations,
    modelFilePath:
      typeof options.modelFilePath === 'undefined'
        ? './model.ckpt'
        : options.modelFilePath,
    outputDirectoryPath:
      typeof options.outputDirectoryPath === 'undefined'
        ? './output'
        : options.outputDirectoryPath,
    seed: typeof options.seed === 'undefined' ? 42 : options.seed,
    stableDiffusionRepositoryDirectoryPath:
      typeof options.stableDiffusionRepositoryDirectoryPath === 'undefined'
        ? './stable-diffusion'
        : options.stableDiffusionRepositoryDirectoryPath,
    strength: typeof options.strength === 'undefined' ? 0.75 : options.strength
  }
}
