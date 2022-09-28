import argparse
import numpy
import omegaconf
import os
import PIL
import pytorch_lightning
import torch
import tqdm

import ldm.models.diffusion.ddim
import utilities


CONFIG_FILE = "models/ldm/inpainting_big/config.yaml"
DEVICE = "cpu"
LOG_PREFIX = "Sampling"


def create_batch(image_file_path, mask_file_path, device):
    image = numpy.array(PIL.Image.open(image_file_path).convert("RGB"))
    image = image.astype(numpy.float32)/255.0
    image = image[None].transpose(0, 3, 1, 2)
    image = torch.from_numpy(image)

    mask = numpy.array(PIL.Image.open(mask_file_path).convert("L"))
    mask = mask.astype(numpy.float32) / 255.0
    mask = mask[None, None]
    mask[mask < 0.5] = 0
    mask[mask >= 0.5] = 1
    mask = torch.from_numpy(mask)

    masked_image = (1 - mask) * image

    return {
        "image": image.to(device=device) * 2.0 - 1.0,
        "mask": mask.to(device=device) * 2.0 - 1.0,
        "masked_image": masked_image.to(device=device) * 2.0 - 1.0
    }


def inpaint_image(options):
    os.makedirs(options.output_directory_path, exist_ok=True)

    if (options.seed != None):
        pytorch_lightning.seed_everything(options.seed)

    device = torch.device(DEVICE)
    config = omegaconf.OmegaConf.load(CONFIG_FILE)
    model = utilities.load_model(
        config=config, file=options.model_file_path).to(device)

    sampler = ldm.models.diffusion.ddim.DDIMSampler(model)

    with torch.no_grad():
        with model.ema_scope():
            for _ in tqdm.trange(1, desc=LOG_PREFIX):
                batch = create_batch(
                    device=device,
                    image_file_path=options.image_file_path,
                    mask_file_path=options.mask_file_path
                )

                conditioning = model.cond_stage_model.encode(
                    batch['masked_image'])
                cc = torch.nn.functional.interpolate(
                    batch['mask'], size=conditioning.shape[-2:])
                conditioning = torch.cat((conditioning, cc), dim=1)
                shape = (conditioning.shape[1] - 1, ) + conditioning.shape[2:]

                samples, _ = sampler.sample(
                    S=options.steps,
                    conditioning=conditioning,
                    batch_size=conditioning.shape[0],
                    shape=shape,
                    verbose=False
                )
                samples = model.decode_first_stage(samples)
                samples = torch.clamp((samples + 1.0) / 2.0, min=0.0, max=1.0)

                image = torch.clamp(
                    (batch['image'] + 1.0) / 2.0, min=0.0, max=1.0)
                mask = torch.clamp(
                    (batch['mask'] + 1.0) / 2.0, min=0.0, max=1.0)

                inpainted = ((1 - mask) * image) + (mask * samples)
                inpainted = inpainted.cpu().numpy(
                ).transpose(0, 2, 3, 1)[0] * 255
                inpainted = PIL.Image.fromarray(
                    inpainted.astype(numpy.uint8))
                inpainted.save(os.path.join(
                    options.output_directory_path, "1.png"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image_file_path", type=str, required=True)
    parser.add_argument("--mask_file_path", type=str, required=True)
    parser.add_argument("--model_file_path", type=str, required=True)
    parser.add_argument("--output_directory_path", type=str, required=True)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--steps", type=int, required=True)
    options = parser.parse_args()
    inpaint_image(options)


if __name__ == "__main__":
    main()
