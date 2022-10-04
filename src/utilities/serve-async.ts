import cors from 'cors'
import express from 'express'
import fs from 'fs-extra'
import { gray, yellow } from 'kleur/colors'
import multer from 'multer'
import { EventEmitter } from 'node:events'
import https from 'node:https'
import { join } from 'node:path'
import PQueue from 'p-queue'
import tempDir from 'temp-dir'

import { imageToImage } from '../api/image-to-image.js'
import { inpaintImage } from '../api/inpaint-image.js'
import { textToImage } from '../api/text-to-image.js'
import {
  BaseOptions,
  ImageToImageOptions,
  InpaintImageOptions,
  Progress,
  TextToImageOptions
} from '../types.js'
import { addImageFileExtensionAsync } from './add-image-file-extension-async.js'
import { createDatabase } from './create-database.js'
import { createId } from './create-id.js'
import { log } from './log.js'

export type ConfigOptionKeys = keyof Omit<BaseOptions, 'seed'>

const DATABASE_DIRECTORY_NAME = '.database'

export async function serveAsync(options: {
  certFilePath: string
  concurrency: number
  deleteIncomplete: boolean
  inpaintImageModelFilePath: string
  keyFilePath: string
  outputDirectoryPath: string
  port: number
  stableDiffusionRepositoryDirectoryPath: string
  textToImageModelFilePath: string
}): Promise<void> {
  const {
    certFilePath,
    concurrency,
    deleteIncomplete,
    inpaintImageModelFilePath,
    keyFilePath,
    textToImageModelFilePath,
    outputDirectoryPath,
    port,
    stableDiffusionRepositoryDirectoryPath
  } = options

  const db = createDatabase(join(outputDirectoryPath, DATABASE_DIRECTORY_NAME))

  const queue = new PQueue({ concurrency })

  if (deleteIncomplete === true) {
    await db.deleteIncompleteJobsAsync()
  }

  async function run(options: {
    execute: () => EventEmitter
    id: string
    res: { redirect: (url: string) => void }
    req: { path: string }
  }): Promise<void> {
    const { execute, id, res, req } = options
    const logPrefix = `${yellow(req.path.padEnd(15, ' '))} ${gray(id)}`
    const result = await db.getJobStatusAsync(req.path, id)
    if (result === null) {
      await db.setJobStatusToQueuedAsync(req.path, id)
      log.info(`${logPrefix} Queued...`)
      queue.add(function () {
        return new Promise<void>(function (resolve: () => void) {
          log.info(`${logPrefix} Starting...`)
          const eventEmitter = execute()
          eventEmitter.on(
            'progress',
            async function (progress: Progress): Promise<void> {
              await db.setJobStatusToInProgressAsync(req.path, id, progress)
              const progressBars = Array(
                Math.round(progress.currentImageProgress * 10)
              )
                .fill('█')
                .join('')
              log.info(
                `${logPrefix} ${progress.currentImageIndex}/${
                  progress.totalImages
                } ${`${Math.trunc(
                  progress.currentImageProgress * 100
                )}`.padStart(3, ' ')}% ${progressBars}`
              )
            }
          )
          eventEmitter.on('done', async function (): Promise<void> {
            await db.setJobStatusToDoneAsync(req.path, id)
            log.success(`${logPrefix} Done`)
            resolve()
          })
        })
      })
    }
    res.redirect(`${req.path}/${id}`)
  }

  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  const upload = multer({ dest: tempDir })

  app.post(
    '/text-to-image',
    upload.none(),
    async function (
      req: {
        body: { prompt: string } & Omit<TextToImageOptions, ConfigOptionKeys>
        path: string
      },
      res: {
        redirect: (url: string) => void
      }
    ): Promise<void> {
      const id = createId({
        ...req.body,
        modelFilePath: textToImageModelFilePath,
        stableDiffusionRepositoryDirectoryPath
      })
      await run({
        execute: function (): EventEmitter {
          const { prompt, ...rest } = req.body
          return textToImage(prompt, {
            modelFilePath: textToImageModelFilePath,
            outputDirectoryPath: join(outputDirectoryPath, req.path, id),
            stableDiffusionRepositoryDirectoryPath,
            ...rest
          })
        },
        id,
        req,
        res
      })
    }
  )

  app.post(
    '/image-to-image',
    upload.single('image'),
    async function (
      req: {
        body: { prompt: string } & Omit<ImageToImageOptions, ConfigOptionKeys>
        file?: Express.Multer.File
        path: string
      },
      res
    ): Promise<void> {
      if (typeof req.file === 'undefined') {
        throw new Error('Need an `image`')
      }
      const imageFilePath = await addImageFileExtensionAsync(req.file)
      const id = createId({
        ...req.body,
        imageFilePath,
        modelFilePath: textToImageModelFilePath,
        stableDiffusionRepositoryDirectoryPath
      })
      await run({
        execute: function (): EventEmitter {
          const { prompt, ...rest } = req.body
          return imageToImage(prompt, imageFilePath, {
            modelFilePath: textToImageModelFilePath,
            outputDirectoryPath: join(outputDirectoryPath, req.path, id),
            stableDiffusionRepositoryDirectoryPath,
            ...rest
          })
        },
        id,
        req,
        res
      })
    }
  )

  app.post(
    '/inpaint-image',
    upload.fields([
      { maxCount: 1, name: 'image' },
      { maxCount: 1, name: 'mask' }
    ]),
    async function (
      req: {
        body: Omit<InpaintImageOptions, ConfigOptionKeys>
        files?:
          | Array<Express.Multer.File>
          | Record<string, Array<Express.Multer.File>>
        path: string
      },
      res: {
        redirect: (url: string) => void
      }
    ): Promise<void> {
      if (typeof req.files === 'undefined' || Array.isArray(req.files)) {
        throw new Error('Need an `image` and a `mask`')
      }
      const { image, mask } = req.files
      const imageFilePath = await addImageFileExtensionAsync(image[0])
      const maskFilePath = await addImageFileExtensionAsync(mask[0])
      const id = createId({
        ...req.body,
        imageFilePath,
        maskFilePath,
        modelFilePath: inpaintImageModelFilePath
      })
      await run({
        execute: function (): EventEmitter {
          return inpaintImage(imageFilePath, maskFilePath, {
            modelFilePath: inpaintImageModelFilePath,
            outputDirectoryPath: join(outputDirectoryPath, req.path, id),
            stableDiffusionRepositoryDirectoryPath,
            ...req.body
          })
        },
        id,
        req,
        res
      })
    }
  )

  app.get(
    '/:type(text-to-image|image-to-image|inpaint-image)/:id',
    async function (req, res, next): Promise<void> {
      const result = await db.getJobStatusAsync(
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
