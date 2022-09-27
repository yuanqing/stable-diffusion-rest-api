#!/usr/bin/env node
import sade from 'sade'

import { serveAsync } from './utilities/serve-async.js'

sade('stable-diffusion-rest-api', true)
  .option('--cert', 'Path to the SSL certicate', './cert.pem')
  .option(
    '--delete-incomplete',
    'Delete all incomplete image generation tasks',
    false
  )
  .option('--key', 'Path to the SSL certicate key', './key.pem')
  .option('--model', 'Path to the Stable Diffusion model', './model.ckpt')
  .option('--output', 'Directory to output generated images', './output')
  .option('--port', 'Port to serve the REST API', 8888)
  .option(
    '--repository',
    'Path to the Stable Diffusion repository',
    './stable-diffusion'
  )
  .action(async function (options: {
    'cert': string
    'delete-incomplete': boolean
    'key': string
    'model': string
    'output': string
    'port': number
    'repository': string
  }) {
    await serveAsync({
      certFilePath: options.cert,
      deleteIncomplete: options['delete-incomplete'],
      keyFilePath: options.key,
      modelFilePath: options.model,
      outputDirectoryPath: options.output,
      port: options.port,
      stableDiffusionRepositoryDirectoryPath: options.repository
    })
  })
  .parse(process.argv)
