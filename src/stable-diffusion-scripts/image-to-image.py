import argparse
import contextlib
import einops
import numpy
import omegaconf
import os
import PIL
import pytorch_lightning
import torch
import tqdm

import ldm.models.diffusion.ddim
import utilities


CONFIG_FILE = "configs/stable-diffusion/v1-inference.yaml"
DEVICE = "mps"
LOG_PREFIX = "Sampling"


def image_to_image(options):
    os.makedirs(options.output_directory_path, exist_ok=True)

    if (options.seed != None):
        pytorch_lightning.seed_everything(options.seed)

    device = torch.device(DEVICE)
    config = omegaconf.OmegaConf.load(CONFIG_FILE)
    model = utilities.load_model(
        config=config, file=options.model_file_path).to(device)

    sampler = ldm.models.diffusion.ddim.DDIMSampler(model)
    sampler.make_schedule(
        ddim_eta=options.eta, ddim_num_steps=options.steps, verbose=False
    )

    image = utilities.load_image(file=options.image_file_path).to(device)
    image = einops.repeat(image, "1 ... -> b ...", b=options.batch_size)

    x0 = model.get_first_stage_encoding(model.encode_first_stage(image))
    t_start = int(options.strength * options.steps)

    count = 1
    with torch.no_grad():
        with contextlib.nullcontext(device.type):
            with model.ema_scope():
                for _ in tqdm.trange(options.iterations, desc=LOG_PREFIX):
                    conditioning = model.get_learned_conditioning(
                        options.batch_size * [options.prompt]
                    )
                    unconditional_conditioning = (
                        None
                        if options.guidance_scale == 1.0
                        else model.get_learned_conditioning(options.batch_size * [""])
                    )
                    t = torch.tensor(options.batch_size * [t_start]).to(device)
                    x_latent = sampler.stochastic_encode(x0=x0, t=t)

                    samples = sampler.decode(
                        cond=conditioning,
                        t_start=t_start,
                        unconditional_conditioning=unconditional_conditioning,
                        unconditional_guidance_scale=options.guidance_scale,
                        x_latent=x_latent,
                    )
                    samples = model.decode_first_stage(samples)
                    samples = torch.clamp(
                        (samples + 1.0) / 2.0, min=0.0, max=1.0)

                    for sample in samples:
                        sample = 255.0 * einops.rearrange(
                            sample.cpu().numpy(), "c h w -> h w c"
                        )
                        image = PIL.Image.fromarray(sample.astype(numpy.uint8))
                        image.save(os.path.join(
                            options.output_directory_path, f"{count}.png"))
                        count += 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch_size", type=int, required=True)
    parser.add_argument("--eta", type=float, required=True)
    parser.add_argument("--guidance_scale", type=float, required=True)
    parser.add_argument("--image_file_path", type=str, required=True)
    parser.add_argument("--iterations", type=int, required=True)
    parser.add_argument("--model_file_path", type=str, required=True)
    parser.add_argument("--output_directory_path", type=str, required=True)
    parser.add_argument("--prompt", type=str, required=True)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--steps", type=int, required=True)
    parser.add_argument("--strength", type=float, required=True)
    options = parser.parse_args()
    image_to_image(options)


if __name__ == "__main__":
    main()
