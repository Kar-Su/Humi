from importlib import import_module

REGISTRY: dict[str, str] = {
    "mms": "engines.mms",
    "piper": "engines.piper",
    "sovits": "engines.gptsovits",
    "wikidepia": "engines.wikidepia_engine",
    "rvc": "engines.rvc_engine",
}


def load_engine(name: str):
    module = import_module(REGISTRY[name])
    return module.Engine()
