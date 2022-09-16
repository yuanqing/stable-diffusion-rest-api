import cors from 'cors'
import express from 'express'
import fs from 'fs-extra'
import { globby } from 'globby'
import https from 'https'
import { yellow } from 'kleur/colors'
import multer from 'multer'
import { join } from 'path'
import tempDir from 'temp-dir'

import { textToImageAsync } from './api/text-to-image-async.js'
import { textWithImageToImageAsync } from './api/text-with-image-to-image-async.js'
import {
  DEFAULT_DDIM_STEPS,
  DEFAULT_ITERATIONS,
  DEFAULT_SEED
} from './utilities/constants.js'
import { log } from './utilities/log.js'

export async function serveAsync(options: {
  certFilePath: string
  keyFilePath: string
  modelFilePath: string
  outputDirectoryPath: string
  port: number
  stableDiffusionDirectoryPath: string
}): Promise<void> {
  const {
    certFilePath,
    keyFilePath,
    modelFilePath,
    outputDirectoryPath,
    port,
    stableDiffusionDirectoryPath
  } = options

  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.use('/output', express.static(outputDirectoryPath))

  app.post(
    '/text',
    multer().none(),
    async function (
      req: {
        body: {
          ddimSteps?: string
          iterations?: string
          prompt: string
          seed?: string
        }
        path: string
      },
      res
    ): Promise<void> {
      const { ddimSteps, iterations, prompt, seed } = req.body
      log.info(`${yellow(req.path)} "${prompt}"...`)
      const id = await textToImageAsync({
        ddimSteps:
          typeof ddimSteps === 'undefined'
            ? DEFAULT_DDIM_STEPS
            : parseInt(ddimSteps, 10),
        iterations:
          typeof iterations === 'undefined'
            ? DEFAULT_ITERATIONS
            : parseInt(iterations, 10),
        modelFilePath,
        outputDirectoryPath,
        prompt,
        seed: typeof seed === 'undefined' ? DEFAULT_SEED : parseInt(seed, 10),
        stableDiffusionDirectoryPath
      })
      const directory = join(outputDirectoryPath, id)
      log.success(`Rendered to ${yellow(directory)}`)
      const imageFiles = (await globby(`${directory}/*.png`)).map(function (
        file: string
      ) {
        return `/${file}`
      })
      res.json(imageFiles)
    }
  )

  app.post(
    '/text-with-image',
    multer({ dest: tempDir }).single('image'),
    async function (
      req: {
        body: {
          ddimSteps?: string
          iterations?: string
          prompt: string
          seed?: string
        }
        path: string
        file?: Express.Multer.File
      },
      res
    ): Promise<void> {
      if (typeof req.file === 'undefined') {
        throw new Error('Need an image')
      }
      const imageFileType = parseImageFileType(req.file)
      if (imageFileType === null) {
        throw new Error('Invalid image type')
      }
      const inputImageFilePath = `${req.file.path}.${imageFileType}`
      await fs.move(req.file.path, inputImageFilePath)
      const { ddimSteps, iterations, prompt, seed } = req.body
      log.info(`${yellow(req.path)} "${prompt}"`)
      const id = await textWithImageToImageAsync({
        ddimSteps:
          typeof ddimSteps === 'undefined'
            ? DEFAULT_DDIM_STEPS
            : parseInt(ddimSteps, 10),
        inputImageFilePath,
        iterations:
          typeof iterations === 'undefined'
            ? DEFAULT_ITERATIONS
            : parseInt(iterations, 10),
        modelFilePath,
        outputDirectoryPath,
        prompt,
        seed: typeof seed === 'undefined' ? DEFAULT_SEED : parseInt(seed, 10),
        stableDiffusionDirectoryPath
      })
      const directory = join(outputDirectoryPath, id)
      log.success(`Rendered to ${yellow(directory)}`)
      const imageFiles = (await globby(`${directory}/*.png`)).map(function (
        file: string
      ) {
        return `/${file}`
      })
      res.json(imageFiles)
    }
  )

  const server = https
    .createServer(
      {
        cert: await fs.readFile(certFilePath, 'utf8'),
        key: await fs.readFile(keyFilePath, 'utf8')
      },
      app
    )
    .listen(port, function () {
      log.clearViewport()
      log.success(`Serving on ${yellow(`https://0.0.0.0:${port}/`)}`)
    })
  server.on('error', function (error: Error) {
    log.error(error.message)
  })
}

function parseImageFileType(file: Express.Multer.File): null | 'jpg' | 'png' {
  switch (file.mimetype) {
    case 'image/png':
      return 'png'
    case 'image/png':
      return 'png'
    default:
      return null
  }
}
