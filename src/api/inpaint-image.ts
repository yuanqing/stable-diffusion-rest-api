import EventEmitter from 'node:events'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { InpaintImageOptions } from '../types.js'
import { executeStableDiffusionScript } from '../utilities/execute-stable-diffusion-script.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT_FILE_PATH = resolve(
  __dirname,
  '..',
  'stable-diffusion-scripts',
  'inpaint-image.py'
)

export function inpaintImage(
  imageFilePath: string,
  maskFilePath: string,
  options: InpaintImageOptions = {}
): EventEmitter {
  const parsedOptions = parseInpaintImageOptions(options)
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
      maskFilePath: resolve(maskFilePath)
    },
    scriptFilePath: SCRIPT_FILE_PATH,
    stableDiffusionRepositoryDirectoryPath
  })
}

function parseInpaintImageOptions(
  options: InpaintImageOptions
): Required<InpaintImageOptions> {
  return {
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
    steps: typeof options.steps === 'undefined' ? 32 : options.steps
  }
}
