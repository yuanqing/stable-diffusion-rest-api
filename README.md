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

### Text-to-image

**`POST`** **`/text-to-image`**

```sh
curl https://0.0.0.0:8888/text-to-image \
  --form prompt="A digital illustration of a beautiful mountain landscape, detailed, thom tenerys, epic composition, 4k, trending on artstation, fantasy vivid colors" \
  --form iterations="2" \
  --form steps="8" \
  --form seed="42" \
  --header "Content-Type: multipart/form-data" \
  --location
```

**`GET`** **`/text-to-image/<ID>`**

```sh
curl https://0.0.0.0:8888/text-to-image/<ID>
```

### Image-to-image

**`POST`** **`/image-to-image`**

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

**`GET`** **`/image-to-image/<ID>`**

```sh
curl https://0.0.0.0:8888/image-to-image/<ID>
```

### Inpaint image

**`POST`** **`/inpaint-image`**

```sh
curl https://0.0.0.0:8888/inpaint-image \
  --form image=@./image.png \
  --form mask=@./image-mask.png \
  --form steps="32" \
  --form seed="42" \
  --header "Content-Type: multipart/form-data" \
  --location
```

**`GET`** **`/inpaint-image/<ID>`**

```sh
curl https://0.0.0.0:8888/inpainting/<ID>
```
