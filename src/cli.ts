#!/usr/bin/env node
import sade from 'sade'

import { serveAsync } from './serve-async.js'

sade('stable-diffusion-rest-api', true)
  .option('-c, --cert', '', './cert.pem')
  .option('-k, --key', '', './key.pem')
  .option('-m, --model', '', './model.ckpt')
  .option('-o, --output', '', './output')
  .option('-p, --port', '', 8888)
  .option('-s, --seed', '', 42)
  .option('-sd, --stable-diffusion-directory', '', './stable-diffusion')
  .action(async function (options: {
    cert: string
    key: string
    model: string
    output: string
    port: number
    seed: number
    sd: string
  }) {
    const { cert, key, model, output, port, seed, sd } = options
    await serveAsync({
      certFilePath: cert,
      defaultSeed: seed,
      keyFilePath: key,
      modelFilePath: model,
      outputDirectoryPath: output,
      port,
      stableDiffusionDirectoryPath: sd
    })
  })
  .parse(process.argv)
