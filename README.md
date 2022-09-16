# Stable Diffusion REST API [![npm Version](https://img.shields.io/npm/v/stable-diffusion-rest-api?cacheSeconds=1800)](https://npmjs.com/package/stable-diffusion-rest-api) ![stability experimental](https://img.shields.io/badge/stability-experimental-red?cacheSeconds=1800) [![build](https://img.shields.io/github/workflow/status/yuanqing/stable-diffusion-rest-api/build?cacheSeconds=1800)](https://github.com/yuanqing/stable-diffusion-rest-api/actions?query=workflow%3Abuild)

> A CLI for running Stable Diffusion locally via a REST API on an M1/M2 MacBook

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

Clone the Stable Diffusion fork:

```sh
git clone -b apple-silicon-mps-support https://github.com/bfirsh/stable-diffusion.git
```

Add the following line to the `stable-diffusion/scripts/img2img.py` file, right before the `from ldm.util import instantiate_from_config` line:

```py
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
```

Set up a `virtualenv` and install dependencies:

```sh
cd stable-diffusion
python3 -m pip install virtualenv
python3 -m virtualenv venv
pip install -r requirements.txt
cd ..
```

Download [`sd-v1-4.ckpt`](https://huggingface.co/CompVis/stable-diffusion-v-1-4-original), and move it to the current working directory:

```sh
mv ~/Downloads/sd-v1-4.ckpt ./
```

Generate a certificate and key to enable HTTPS:

```sh
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem 0.0.0.0
```

## Usage

Start the API server:

```sh
npx --yes -- stable-diffusion-rest-api \
  --cert ./cert.pem \
  --key ./key.pem \
  --output ./output \
  --model ./sd-v1-4.ckpt \
  --port 8888
```

### Text → Image

(*`txt2img`*)

**`POST`** **`/text`**

```sh
curl https://0.0.0.0:8888/text \
  --form ddimSteps="8" \
  --form iterations="1" \
  --form prompt="A digital illustration of a dystopian landscape, thom tenerys, cyberpunk, epic composition, 4k, detailed, trending on artstation, fantasy vivid colors" \
  --form seed="42" \
  --header "Content-Type: multipart/form-data" \
  --output output.json \
  --request POST
```

### Text + Image → Image

(*`img2img`*)

**`POST`** **`/text-with-image`**

```sh
curl https://0.0.0.0:8888/text-with-image \
  --form ddimSteps="8" \
  --form iterations="1" \
  --form image=@./input.png \
  --form prompt="A digital illustration of a dystopian landscape, thom tenerys, cyberpunk, epic composition, 4k, detailed, trending on artstation, fantasy vivid colors" \
  --form seed="42" \
  --header "Content-Type: multipart/form-data" \
  --output output.json \
  --request POST
```
