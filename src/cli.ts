#!/usr/bin/env node
import sade from 'sade'

import { serveAsync } from './serve-async.js'

sade('stable-diffusion-rest-api', true)
  .option('-c, --cert', 'Path to the SSL certicate', './cert.pem')
  .option('-k, --key', 'Path to the SSL certicate key', './key.pem')
  .option('-m, --model', 'Path to the Stable Diffusion model', './model.ckpt')
  .option('-o, --output', 'Directory to output generated images', './output')
  .option('-p, --port', 'Port to serve the REST API', 8888)
  .option(
    '-s, --stable-diffusion-repository',
    'Path to the Stable Diffusion repository',
    './stable-diffusion'
  )
  .action(async function (options: {
    cert: string
    key: string
    model: string
    output: string
    port: number
    s: string
  }) {
    const { cert, key, model, output, port, s } = options
    await serveAsync({
      certFilePath: cert,
      keyFilePath: key,
      modelFilePath: model,
      outputDirectoryPath: output,
      port,
      stableDiffusionDirectoryPath: s
    })
  })
  .parse(process.argv)
