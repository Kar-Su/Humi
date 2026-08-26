import argparse
import os

import numpy as np
import soundfile as sf


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--index", default="")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--pitch", type=int, default=0)
    args = parser.parse_args()

    import rvc_python
    from rvc_python.configs.config import Config
    from rvc_python.modules.vc.modules import VC

    lib_dir = os.path.dirname(os.path.abspath(rvc_python.__file__))
    vc = VC(lib_dir, Config(lib_dir, args.device))
    vc.get_vc(args.model)
    out = vc.vc_single(
        sid=0,
        input_audio_path=args.input,
        f0_up_key=args.pitch,
        f0_file="",
        f0_method="rmvpe",
        file_index=args.index,
        file_index2="",
        index_rate=0.5,
        filter_radius=3,
        resample_sr=0,
        rms_mix_rate=0.25,
        protect=0.33,
    )
    if not isinstance(out, np.ndarray):
        raise RuntimeError(f"konversi gagal: {str(out)[:300]}")
    sf.write(args.output, out, vc.tgt_sr)


if __name__ == "__main__":
    main()
