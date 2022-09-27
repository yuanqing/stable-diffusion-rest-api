import cors from 'cors'
import express from 'express'
import fs from 'fs-extra'
import { gray, yellow } from 'kleur/colors'
import multer from 'multer'
import { EventEmitter } from 'node:events'
import https from 'node:https'
import { join } from 'node:path'
import tempDir from 'temp-dir'
import { JsonObject } from 'type-fest'

import { imageToImage } from '../api/image-to-image.js'
import { textToImage } from '../api/text-to-image.js'
import { ImageToImageOptions, Progress, TextToImageOptions } from '../types.js'
import { createId } from './create-id.js'
import { createStatusDatabase } from './create-status-database.js'
import { log } from './log.js'

export type ConfigOptions =
  | 'configFilePath'
  | 'databaseDirectoryPath'
  | 'modelFilePath'
  | 'outputDirectoryPath'
  | 'stableDiffusionRepositoryDirectoryPath'

export async function serveAsync(options: {
  certFilePath: string
  configFilePath: string
  deleteIncomplete: boolean
  keyFilePath: string
  modelFilePath: string
  outputDirectoryPath: string
  port: number
  stableDiffusionRepositoryDirectoryPath: string
}): Promise<void> {
  const {
    certFilePath,
    configFilePath,
    deleteIncomplete,
    keyFilePath,
    modelFilePath,
    outputDirectoryPath,
    port,
    stableDiffusionRepositoryDirectoryPath
  } = options

  const statusDatabase = createStatusDatabase(
    join(outputDirectoryPath, '.database')
  )

  if (deleteIncomplete === true) {
    await statusDatabase.deleteAllIncompleteAsync()
  }

  async function run(
    req: { body: { prompt: string } & JsonObject; path: string },
    res: { redirect: (url: string) => void },
    execute: (id: string) => EventEmitter
  ): Promise<void> {
    const id = createId({
      configFilePath,
      modelFilePath,
      stableDiffusionRepositoryDirectoryPath,
      ...req.body
    })
    const logPrefix = `${yellow(req.path)} ${gray(id)}`
    const result = await statusDatabase.getStatusAsync(req.path, id)
    if (result === null) {
      await statusDatabase.setStatusToQueuedAsync(req.path, id)
      const eventEmitter = execute(id)
      log.info(`${logPrefix} "${req.body.prompt}"`)
      eventEmitter.on(
        'progress',
        async function (progress: Progress): Promise<void> {
          await statusDatabase.setStatusToInProgressAsync(
            req.path,
            id,
            progress
          )
          const progressBars = Array(Math.round(progress.progress * 10))
            .fill('█')
            .join('')
          log.info(
            `${logPrefix} ${progress.currentSample}/${
              progress.totalSamples
            } ${`${Math.trunc(progress.progress * 100)}`.padStart(
              3,
              ' '
            )}% ${progressBars}`
          )
        }
      )
      eventEmitter.on('done', async function (): Promise<void> {
        await statusDatabase.setStatusToDoneAsync(req.path, id)
        log.success(logPrefix)
      })
    }
    res.redirect(`${req.path}/${id}`)
  }

  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.post(
    '/text-to-image',
    multer().none(),
    async function (
      req: {
        body: { prompt: string } & Omit<TextToImageOptions, ConfigOptions>
        path: string
      },
      res: {
        redirect: (url: string) => void
      }
    ): Promise<void> {
      await run(req, res, function (id: string): EventEmitter {
        const { prompt, ...rest } = req.body
        return textToImage(prompt, {
          configFilePath,
          modelFilePath,
          outputDirectoryPath: join(outputDirectoryPath, req.path, id),
          stableDiffusionRepositoryDirectoryPath,
          ...rest
        })
      })
    }
  )

  app.post(
    '/image-to-image',
    multer({ dest: tempDir }).single('image'),
    async function (
      req: {
        body: { prompt: string } & Omit<ImageToImageOptions, ConfigOptions>
        file?: Express.Multer.File
        path: string
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
      await run(req, res, function (id: string): EventEmitter {
        const { prompt, ...rest } = req.body
        return imageToImage(prompt, inputImageFilePath, {
          configFilePath,
          modelFilePath,
          outputDirectoryPath: join(outputDirectoryPath, req.path, id),
          stableDiffusionRepositoryDirectoryPath,
          ...rest
        })
      })
    }
  )

  app.get(
    '/:type(image-to-image|text-to-image)/:id',
    async function (req, res, next): Promise<void> {
      const result = await statusDatabase.getStatusAsync(
        `/${req.params.type}`,
        req.params.id
      )
      if (result === null) {
        next()
        return
      }
      res.json(result)
    }
  )

  app.use(express.static(outputDirectoryPath, { dotfiles: 'ignore' }))

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
    case 'image/jpg':
      return 'jpg'
    case 'image/png':
      return 'png'
    default:
      return null
  }
}
