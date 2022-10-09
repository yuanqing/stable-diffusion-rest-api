#!/usr/bin/env node
import sade from 'sade'

import {
  DEFAULT_CERT_FILE_PATH,
  DEFAULT_CONCURRENCY,
  DEFAULT_KEY_FILE_PATH,
  DEFAULT_MODEL_FILE_PATH_INPAINT_IMAGE,
  DEFAULT_MODEL_FILE_PATH_TEXT_TO_IMAGE,
  DEFAULT_OUTPUT_DIRECTORY_PATH,
  DEFAULT_PORT,
  DEFAULT_STABLE_DIFFUSION_REPOSITORY_DIRECTORY_PATH
} from './utilities/constants.js'
import { serveAsync } from './utilities/serve-async.js'

sade('stable-diffusion-rest-api', true)
  .option('--cert', 'Path to the SSL certicate', DEFAULT_CERT_FILE_PATH)
  .option(
    '--concurrency',
    'Number of concurrent image generation tasks',
    DEFAULT_CONCURRENCY
  )
  .option(
    '--delete-incomplete',
    'Delete all incomplete image generation tasks before starting the server',
    false
  )
  .option(
    '--inpaint-image-model',
    'Path to the inpaint image model checkpoint',
    DEFAULT_MODEL_FILE_PATH_INPAINT_IMAGE
  )
  .option('--key', 'Path to the SSL certicate key', DEFAULT_KEY_FILE_PATH)
  .option(
    '--output',
    'Directory to output generated images',
    DEFAULT_OUTPUT_DIRECTORY_PATH
  )
  .option('--port', 'Port to serve the REST API', DEFAULT_PORT)
  .option(
    '--repository',
    'Path to the Stable Diffusion repository',
    DEFAULT_STABLE_DIFFUSION_REPOSITORY_DIRECTORY_PATH
  )
  .option(
    '--text-to-image-model',
    'Path to the text-to-image model checkpoint',
    DEFAULT_MODEL_FILE_PATH_TEXT_TO_IMAGE
  )
  .action(async function (options: {
    'cert': string
    'concurrency': number
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
      concurrency: options['concurrency'],
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
