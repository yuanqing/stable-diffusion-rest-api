type BaseRestApiResponse = {
  resultUrl: string
}
export type RestApiResponse =
  | QueuedResponse
  | InProgressResponse
  | CompleteResponse
export type QueuedResponse = BaseRestApiResponse & {
  status: 'QUEUED'
}
export type InProgressResponse = BaseRestApiResponse & {
  status: 'IN_PROGRESS'
  progress: Progress
  imageUrls: Array<string>
}
export type CompleteResponse = BaseRestApiResponse & {
  status: 'COMPLETE'
  imageUrls: Array<string>
}
export type Progress = {
  currentImageIndex: number
  currentImageProgress: number
  totalImages: number
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
export type InpaintImageOptions = BaseOptions & {
  steps?: number
}
