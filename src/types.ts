export type Progress = {
  currentSample: number
  progress: number
  totalSamples: number
}

type BaseOptions = {
  batchSize?: number
  configFilePath?: string
  ddimEta?: number
  ddimSteps?: number
  guidanceScale?: number
  iterations?: number
  modelFilePath?: string
  outputDirectoryPath?: string
  seed?: number
  stableDiffusionRepositoryDirectoryPath?: string
}

export type ImageToImageOptions = BaseOptions & {
  strength?: number
}

export type TextToImageOptions = BaseOptions & {
  channels?: number
  downsamplingFactor?: number
  height?: number
  sampler?: 'ddim' | 'plms'
  width?: number
}
