export type RestApiResponse = {
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE'
  resultUrl: string
  images: Array<{
    url: string
    progress: number
  }>
}

export type Progress = {
  currentSample: number
  progress: number
  totalSamples: number
}

export type BaseOptions = {
  modelFilePath?: string
  outputDirectoryPath?: string
  seed?: number
  stableDiffusionRepositoryDirectoryPath?: string
}

export type TextToImageOptions = BaseOptions & {
  batchSize?: number
  eta?: number
  guidanceScale?: number
  iterations?: number
  steps?: number
  channels?: number
  downsamplingFactor?: number
  height?: number
  width?: number
}

export type ImageToImageOptions = BaseOptions & {
  strength?: number
  batchSize?: number
  eta?: number
  guidanceScale?: number
  iterations?: number
  steps?: number
}

export type InpaintImageOptions = {
  modelFilePath?: string
  outputDirectoryPath?: string
  seed?: number
  stableDiffusionRepositoryDirectoryPath?: string
  steps?: number
}
