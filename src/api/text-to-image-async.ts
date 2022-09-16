import { ensureDir, move } from 'fs-extra'
import { join, resolve } from 'path'
import tempDir from 'temp-dir'

import { createId } from '../utilities/create-id.js'
import { executeShellCommandAsync } from '../utilities/execute-shell-command-async.js'

export async function textToImageAsync(options: {
  ddimSteps: number
  iterations: number
  modelFilePath: string
  outputDirectoryPath: string
  prompt: string
  seed: number
  stableDiffusionDirectoryPath: string
}): Promise<string> {
  const {
    ddimSteps,
    iterations,
    modelFilePath,
    outputDirectoryPath,
    prompt,
    seed,
    stableDiffusionDirectoryPath
  } = options

  const stableDiffusionAbsolutePath = resolve(stableDiffusionDirectoryPath)
  const venvDirectoryAbsolutePath = join(stableDiffusionAbsolutePath, 'venv')
  const modelAbsolutePath = resolve(modelFilePath)

  const id = createId()
  const tempOutputDirectory = join(tempDir, id)
  await ensureDir(tempOutputDirectory)

  const command = `cd ${stableDiffusionAbsolutePath} && VIRTUAL_ENV="${venvDirectoryAbsolutePath}" PATH="$VIRTUAL_ENV/bin:$PATH" python scripts/txt2img.py --ckpt "${modelAbsolutePath}" --ddim_steps ${ddimSteps} --n_iter ${iterations} --n_samples 1 --outdir "${tempOutputDirectory}" --plms --prompt "${prompt}" --seed ${seed} --skip_grid --W 512 --H 512`
  await executeShellCommandAsync(command)

  const outputImageDirectoryPath = join(resolve(outputDirectoryPath), id)
  await move(join(tempOutputDirectory, 'samples'), outputImageDirectoryPath)

  return id
}
