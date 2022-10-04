# Stable Diffusion REST API [![npm Version](https://img.shields.io/npm/v/stable-diffusion-rest-api?cacheSeconds=1800)](https://npmjs.com/package/stable-diffusion-rest-api) ![stability experimental](https://img.shields.io/badge/stability-experimental-red?cacheSeconds=1800) [![build](https://img.shields.io/github/workflow/status/yuanqing/stable-diffusion-rest-api/build?cacheSeconds=1800)](https://github.com/yuanqing/stable-diffusion-rest-api/actions?query=workflow%3Abuild)

> Run Stable Diffusion locally via a REST API on an M1/M2 MacBook

## Pre-requisites

- An M1/M2 MacBook
- [Homebrew](https://brew.sh/)
- [Python](https://formulae.brew.sh/formula/python@3.10) – v3.10
- [Node.js](https://formulae.brew.sh/formula/node@16) – v16

## Initial setup

*Adapted from [**Run Stable Diffusion on your M1 Mac’s GPU**](https://replicate.com/blog/run-stable-diffusion-on-m1-mac) by [Ben Firshman](https://twitter.com/bfirsh)*

Update Homebrew and upgrade all existing Homebrew packages:

```sh
brew update
brew upgrade
```

Install Homebrew dependencies:

```sh
brew install cmake mkcert protobuf rust
```

Clone the [Stable Diffusion fork](https://github.com/bfirsh/stable-diffusion):

```sh
git clone -b apple-silicon-mps-support https://github.com/bfirsh/stable-diffusion.git
```

Set up a `virtualenv` and install dependencies:

```sh
cd stable-diffusion
python3 -m pip install virtualenv
python3 -m virtualenv venv
pip install -r requirements.txt
cd ..
```

Download the [text-to-image](https://www.googleapis.com/storage/v1/b/aai-blog-files/o/sd-v1-4.ckpt?alt=media) and [inpaint](https://heibox.uni-heidelberg.de/f/4d9ac7ea40c64582b7c9/?dl=1) model checkpoints:

```sh
mkdir -p models
curl --output models/text-to-image.ckpt https://www.googleapis.com/storage/v1/b/aai-blog-files/o/sd-v1-4.ckpt?alt=media
curl --output models/inpaint-image.ckpt https://ommer-lab.com/files/latent-diffusion/inpainting_big.zip
```

Generate a HTTPS certificate and key:

```sh
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem 0.0.0.0
```

## Usage

```

  Usage
    $ stable-diffusion-rest-api [options]

  Options
    --text-to-image-model    Path to the text-to-image model checkpoint  (default ./models/text-to-image.ckpt)
    --inpaint-image-model    Path to the inpaint image model checkpoint  (default ./models/inpaint-image.ckpt)
    --concurrency            Number of concurrent image generation tasks  (default 1)
    --output                 Directory to output generated images  (default ./output)
    --cert                   Path to the SSL certicate  (default ./cert.pem)
    --key                    Path to the SSL certicate key  (default ./key.pem)
    --delete-incomplete      Delete all incomplete image generation tasks before starting the server  (default false)
    --port                   Port to serve the REST API  (default 8888)
    --repository             Path to the Stable Diffusion repository  (default ./stable-diffusion)
    -v, --version            Displays current version
    -h, --help               Displays this message

```

Start the API server:

```sh
npx --yes -- stable-diffusion-rest-api \
  --text-to-image-model ./models/text-to-image.ckpt \
  --inpaint-image-model ./models/inpaint-image.ckpt \
  --concurrency 1 \
  --output ./output \
  --cert ./cert.pem \
  --key ./key.pem \
  --port 8888
```

### API response

All REST API endpoints return JSON with one of the following shapes, depending on the status of the image generation task:

```ts
{
  status: 'QUEUED'
  resultUrl: string
}
```

```ts
{
  status: 'IN_PROGRESS'
  resultUrl: string
  progress: {
    currentImageIndex: number
    currentImageProgress: number
    totalImages: number
  }
  imageUrls: Array<string>
}
```

```ts
{
  status: 'COMPLETE'
  resultUrl: string
  imageUrls: Array<string>
}
```

- **`status`** is one of `QUEUED`, `IN_PROGRESS` or `COMPLETE`
- **`resultUrl`** is the URL to access the results of the image generation task
- **`progress`** contains details about the progress of the image generation task:
  - `currentImageIndex` is the index of the image currently being generated
  - `currentImageProgress` is a value between `0` and `1` representing the progress of generating the current image
  - `totalImages` is the total number of images to be generated
- **`imageUrls`** is the list of URLs of the generated images

### Text to Image

#### `POST` `/text-to-image`

```sh
curl https://0.0.0.0:8888/text-to-image \
  --form prompt="A digital illustration of a beautiful mountain landscape, detailed, thom tenerys, epic composition, 4k, trending on artstation, fantasy vivid colors" \
  --form iterations="3" \
  --form steps="8" \
  --form seed="42" \
  --header "Content-Type: multipart/form-data" \
  --location
```

> *Sample response*
>
> ```json
> {
>   "status": "QUEUED",
>   "resultUrl": "/text-to-image/61f957e4462ea8eff36d9e7a7b650994"
> }
> ```

#### `GET` `/text-to-image/<ID>`

```sh
curl https://0.0.0.0:8888/text-to-image/61f957e4462ea8eff36d9e7a7b650994
```

> *Sample response*
>
> ```json
> {
>   "status": "IN_PROGRESS",
>   "resultUrl": "/text-to-image/61f957e4462ea8eff36d9e7a7b650994",
>   "progress": {
>     "totalImages": 3,
>     "currentImageIndex": 3,
>     "currentImageProgress": 0.5
>   },
>   "imageUrls": [
>     "/text-to-image/61f957e4462ea8eff36d9e7a7b650994/1.png",
>     "/text-to-image/61f957e4462ea8eff36d9e7a7b650994/2.png"
>   ]
> }
> ```
>
> ```json
> {
>   "status": "COMPLETE",
>   "resultUrl": "/text-to-image/61f957e4462ea8eff36d9e7a7b650994",
>   "imageUrls": [
>     "/text-to-image/61f957e4462ea8eff36d9e7a7b650994/1.png",
>     "/text-to-image/61f957e4462ea8eff36d9e7a7b650994/2.png",
>     "/text-to-image/61f957e4462ea8eff36d9e7a7b650994/3.png"
>   ]
> }
> ```

### Image to Image

#### `POST` `/image-to-image`

```sh
curl https://0.0.0.0:8888/image-to-image \
  --form prompt="A digital illustration of a beautiful mountain landscape, detailed, thom tenery, epic composition, 4k, trending on artstation, fantasy vivid colors" \
  --form image=@./image.png \
  --form iterations="3" \
  --form steps="24" \
  --form seed="42" \
  --header "Content-Type: multipart/form-data" \
  --location
```

> *Sample response*
>
> ```json
> {
>   "status": "QUEUED",
>   "resultUrl": "/image-to-image/ab1104f3b55fbab7779cdbdc73ed276e"
> }
> ```

#### `GET` `/image-to-image/<ID>`

```sh
curl https://0.0.0.0:8888/image-to-image/ab1104f3b55fbab7779cdbdc73ed276e
```

> *Sample response*
>
> ```json
> {
>   "status": "IN_PROGRESS",
>   "resultUrl": "/image-to-image/ab1104f3b55fbab7779cdbdc73ed276e",
>   "progress": {
>     "totalImages": 3,
>     "currentImageIndex": 3,
>     "currentImageProgress": 0.5
>   },
>   "imageUrls": [
>     "/image-to-image/ab1104f3b55fbab7779cdbdc73ed276e/1.png",
>     "/image-to-image/ab1104f3b55fbab7779cdbdc73ed276e/2.png"
>   ]
> }
> ```
>
> ```json
> {
>   "status": "COMPLETE",
>   "resultUrl": "/image-to-image/ab1104f3b55fbab7779cdbdc73ed276e",
>   "imageUrls": [
>     "/image-to-image/ab1104f3b55fbab7779cdbdc73ed276e/1.png",
>     "/image-to-image/ab1104f3b55fbab7779cdbdc73ed276e/2.png"
>     "/image-to-image/ab1104f3b55fbab7779cdbdc73ed276e/3.png"
>   ]
> }
> ```

### Inpaint Image

#### `POST` `/inpaint-image`

```sh
curl https://0.0.0.0:8888/inpaint-image \
  --form image=@./image.png \
  --form mask=@./image-mask.png \
  --form steps="32" \
  --form seed="42" \
  --header "Content-Type: multipart/form-data" \
  --location
```

> *Sample response*
>
> ```json
> {
>   "status": "QUEUED",
>   "resultUrl": "/inpaint-image/59a89dfc9f075942ce9afc08312b8296"
> }
> ```

#### `GET` `/inpaint-image/<ID>`

```sh
curl https://0.0.0.0:8888/inpaint-image/59a89dfc9f075942ce9afc08312b8296
```

> *Sample response*
>
> ```json
> {
>   "status": "IN_PROGRESS",
>   "resultUrl": "/inpaint-image/59a89dfc9f075942ce9afc08312b8296",
>   "progress": {
>     "totalImages": 1,
>     "currentImageIndex": 1,
>     "currentImageProgress": 0.5
>   },
>   "imageUrls": []
> }
> ```
>
> ```json
> {
>   "status": "COMPLETE",
>   "resultUrl": "/inpaint-image/59a89dfc9f075942ce9afc08312b8296",
>   "imageUrls": [
>     "/inpaint-image/59a89dfc9f075942ce9afc08312b8296/1.png",
>   ]
> }
> ```
