import cors from 'cors'
import express from 'express'
import fs from 'fs-extra'
import https from 'https'
import { yellow } from 'kleur/colors'
import multer from 'multer'
import { relative } from 'path'
import tempDir from 'temp-dir'

import { textToImageAsync } from './api/text-to-image-async.js'
import { textWithImageToImageAsync } from './api/text-with-image-to-image-async.js'
import { log } from './utilities/log.js'

export async function serveAsync(options: {
  certFilePath: string
  keyFilePath: string
  modelFilePath: string
  outputDirectoryPath: string
  port: number
  defaultSeed: number
  stableDiffusionDirectoryPath: string
}): Promise<void> {
  const {
    certFilePath,
    defaultSeed,
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

  app.post(
    '/text',
    multer().none(),
    async function (
      req: {
        body: {
          prompt: string
          seed?: string
        }
        path: string
      },
      res
    ): Promise<void> {
      const { prompt, seed } = req.body
      log.info(`${yellow(req.path)} "${prompt}"...`)
      const filePath = await textToImageAsync({
        modelFilePath,
        outputDirectoryPath,
        prompt,
        seed: typeof seed === 'undefined' ? defaultSeed : parseInt(seed, 10),
        stableDiffusionDirectoryPath
      })
      log.success(`Rendered to ${yellow(relative(process.cwd(), filePath))}`)
      res.sendFile(filePath)
    }
  )

  app.post(
    '/text-with-image',
    multer({ dest: tempDir }).single('image'),
    async function (
      req: {
        body: {
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
      const { prompt, seed } = req.body
      log.info(`${yellow(req.path)} "${prompt}"...`)
      const filePath = await textWithImageToImageAsync({
        inputImageFilePath,
        modelFilePath,
        outputDirectoryPath,
        prompt,
        seed: typeof seed === 'undefined' ? defaultSeed : parseInt(seed, 10),
        stableDiffusionDirectoryPath
      })
      log.success(`Rendered to ${yellow(relative(process.cwd(), filePath))}`)
      res.sendFile(filePath)
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
