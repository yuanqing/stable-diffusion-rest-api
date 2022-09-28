#!/usr/bin/env node
import sade from 'sade'

import { serveAsync } from './utilities/serve-async.js'

sade('stable-diffusion-rest-api', true)
  .option(
    '--text-to-image-model',
    'Path to the text-to-image model checkpoint',
    './models/text-to-image.ckpt'
  )
  .option(
    '--inpaint-image-model',
    'Path to the inpaint image model checkpoint',
    './models/inpaint-image.ckpt'
  )
  .option(
    '--repository',
    'Path to the Stable Diffusion repository',
    './stable-diffusion'
  )
  .option('--output', 'Directory to output generated images', './output')
  .option('--cert', 'Path to the SSL certicate', './cert.pem')
  .option('--key', 'Path to the SSL certicate key', './key.pem')
  .option('--port', 'Port to serve the REST API', 8888)
  .option(
    '--delete-incomplete',
    'Delete all incomplete image generation tasks before starting the server',
    false
  )
  .action(async function (options: {
    'cert': string
    'delete-incomplete': boolean
    'inpaint-image-model': string
    'key': string
    'output': string
    'port': number
    'repository': string
    'text-to-image-model': string
  }) {
    await serveAsync({
      certFilePath: options['cert'],
      deleteIncomplete: options['delete-incomplete'],
      inpaintImageModelFilePath: options['inpaint-image-model'],
      keyFilePath: options['key'],
      outputDirectoryPath: options['output'],
      port: options['port'],
      stableDiffusionRepositoryDirectoryPath: options['repository'],
      textToImageModelFilePath: options['text-to-image-model']
    })
  })
  .parse(process.argv)
