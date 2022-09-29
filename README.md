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

Start the API server:

```sh
npx --yes -- stable-diffusion-rest-api \
  --text-to-image-model ./models/text-to-image.ckpt \
  --inpaint-image-model ./models/inpaint-image.ckpt \
  --output ./output \
  --cert ./cert.pem \
  --key ./key.pem \
  --port 8888
```

### API response

All REST API endpoints return JSON with the following shape:

```ts
{
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE'
  resultUrl: string
  images: Array<{
    progress: number
    url: string
  }>
}
```

- **`status`** – One of `QUEUED`, `IN_PROGRESS` or `COMPLETE`.
- **`resultUrl`** – URL to access the results of the image generation task.
- **`images`** – An array of generated images; this array is empty if `status` is `QUEUED`. For each image, `progress` is a value between `0` and `1` *(both inclusive)*. An image has been successfully generated and will be accessible at `url` if and only if `progress` is `1`.

### Text-to-image

#### `POST` `/text-to-image`

```sh
curl https://0.0.0.0:8888/text-to-image \
  --form prompt="A digital illustration of a beautiful mountain landscape, detailed, thom tenerys, epic composition, 4k, trending on artstation, fantasy vivid colors" \
  --form iterations="2" \
  --form steps="8" \
  --form seed="42" \
  --header "Content-Type: multipart/form-data" \
  --location
```

> *Sample response*
>
> ```json
> {
>   "status": "IN_PROGRESS",
>   "resultUrl": "/text-to-image/8cad07fd239aed5bf46a6d38f94487c1",
>   "images": [
>     {
>       "progress": 0.5,
>       "url": "/text-to-image/8cad07fd239aed5bf46a6d38f94487c1/1.png"
>     },
>     {
>       "progress": 0,
>       "url": "/text-to-image/8cad07fd239aed5bf46a6d38f94487c1/2.png"
>     }
>   ]
> }
> ```

#### `GET` `/text-to-image/<ID>`

```sh
curl https://0.0.0.0:8888/text-to-image/8cad07fd239aed5bf46a6d38f94487c1
```

> *Sample response*
>
> ```json
> {
>   "status": "COMPLETE",
>   "resultUrl": "/text-to-image/8cad07fd239aed5bf46a6d38f94487c1",
>   "images": [
>     {
>       "progress": 1,
>       "url": "/text-to-image/8cad07fd239aed5bf46a6d38f94487c1/1.png"
>     },
>     {
>       "progress": 1,
>       "url": "/text-to-image/8cad07fd239aed5bf46a6d38f94487c1/2.png"
>     }
>   ]
> }
> ```

### Image-to-image

#### `POST` `/image-to-image`

```sh
curl https://0.0.0.0:8888/image-to-image \
  --form prompt="A digital illustration of a beautiful mountain landscape, detailed, thom tenerys, epic composition, 4k, trending on artstation, fantasy vivid colors" \
  --form image=@./image.png \
  --form iterations="2" \
  --form steps="24" \
  --form seed="42" \
  --header "Content-Type: multipart/form-data" \
  --location
```

> *Sample response*
>
> ```json
> {
>   "status": "IN_PROGRESS",
>   "resultUrl": "/image-to-image/634b520c0ad332e179b5899e1f9b842f",
>   "images": [
>     {
>       "progress": 0.67,
>       "url": "/inpaint-image/634b520c0ad332e179b5899e1f9b842f/1.png"
>     },
>     {
>       "progress": 0,
>       "url": "/inpaint-image/634b520c0ad332e179b5899e1f9b842f/2.png"
>     }
>   ]
> }
> ```

#### `GET` `/image-to-image/<ID>`

```sh
curl https://0.0.0.0:8888/image-to-image/634b520c0ad332e179b5899e1f9b842f
```

> *Sample response*
>
> ```json
> {
>   "status": "COMPLETE",
>   "resultUrl": "/image-to-image/634b520c0ad332e179b5899e1f9b842f",
>   "images": [
>     {
>       "progress": 1,
>       "url": "/inpaint-image/634b520c0ad332e179b5899e1f9b842f/1.png"
>     },
>     {
>       "progress": 1,
>       "url": "/inpaint-image/634b520c0ad332e179b5899e1f9b842f/2.png"
>     }
>   ]
> }
> ```

### Inpaint image

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
>   "status": "IN_PROGRESS",
>   "resultUrl": "/inpaint-image/3dddcde9d8170b9a49729dbf27623bb7",
>   "images": [
>     {
>       "progress": 0.45,
>       "url": "/inpaint-image/3dddcde9d8170b9a49729dbf27623bb7/1.png"
>     }
>   ]
> }
> ```

#### `GET` `/inpaint-image/<ID>`

```sh
curl https://0.0.0.0:8888/inpaint-image/3dddcde9d8170b9a49729dbf27623bb7
```

> *Sample response*
>
> ```json
> {
>   "status": "COMPLETE",
>   "resultUrl": "/inpaint-image/3dddcde9d8170b9a49729dbf27623bb7",
>   "images": [
>     {
>       "progress": 1,
>       "url": "/inpaint-image/3dddcde9d8170b9a49729dbf27623bb7/1.png"
>     }
>   ]
> }
> ```
