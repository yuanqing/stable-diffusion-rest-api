export type Progress = {
  currentSample: number
  progress: number
  totalSamples: number
}

type BaseOptions = {
  batchSize?: number
  eta?: number
  guidanceScale?: number
  iterations?: number
  modelFilePath?: string
  outputDirectoryPath?: string
  seed?: number
  stableDiffusionRepositoryDirectoryPath?: string
  steps?: number
}

export type ImageToImageOptions = BaseOptions & {
  strength?: number
}

export type TextToImageOptions = BaseOptions & {
  channels?: number
  downsamplingFactor?: number
  height?: number
  width?: number
}

export type InpaintImageOptions = {
  modelFilePath?: string
  outputDirectoryPath?: string
  seed?: number
  stableDiffusionRepositoryDirectoryPath?: string
  steps?: number
}
