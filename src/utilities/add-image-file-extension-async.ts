import fs from 'fs-extra'

export async function addImageFileExtensionAsync(
  file: Express.Multer.File
): Promise<string> {
  const extension = computeImageFileExtension(file)
  if (extension === null) {
    throw new Error('Invalid image type')
  }
  const imageFilePath = `${file.path}.${extension}`
  await fs.move(file.path, imageFilePath)
  return imageFilePath
}

function computeImageFileExtension(
  file: Express.Multer.File
): null | 'jpg' | 'png' {
  switch (file.mimetype) {
    case 'image/jpg':
      return 'jpg'
    case 'image/png':
      return 'png'
    default:
      return null
  }
}
