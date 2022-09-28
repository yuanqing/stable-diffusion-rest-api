import numpy
import PIL
import torch

import ldm.util


def load_model(file, config):
    model = ldm.util.instantiate_from_config(config.model)
    sd = torch.load(file, map_location="cpu")["state_dict"]
    model.load_state_dict(sd, strict=False)
    model.to("mps")
    model.eval()
    return model


def load_image(file):
    image = PIL.Image.open(file).convert("RGB")
    w, h = image.size
    w, h = map(lambda x: x - x % 32, (w, h))
    image = image.resize((w, h), resample=PIL.Image.Resampling.LANCZOS)
    image = numpy.array(image).astype(numpy.float32) / 255.0
    image = image[None].transpose(0, 3, 1, 2)
    image = torch.from_numpy(image)
    return 2.0 * image - 1.0
