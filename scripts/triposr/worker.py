"""
Worker model 3D MIMS — TripoSR (MIT) di PC dev, CPU.

Loop: ambil antrean dari API (welding_master/model_queue), unduh foto sumber,
hapus background (rembg), generate mesh 3D (TripoSR), export .glb berwarna,
upload balik (model_upload). Gagal → model_fail (antrean dilepas).

Jalankan:  .venv\\Scripts\\python worker.py          (loop, cek tiap 20 dtk)
           .venv\\Scripts\\python worker.py --once   (proses antrean sekali lalu keluar)
           .venv\\Scripts\\python worker.py --image foto.png --out hasil.glb   (tes lokal)
Konfigurasi di worker.env: API_BASE, WORKER_KEY (jangan di-commit).
"""
import argparse
import io
import os
import sys
import time
import traceback

import numpy as np
import rembg
import requests
import torch
from PIL import Image

from tsr.system import TSR
from tsr.utils import remove_background, resize_foreground

HERE = os.path.dirname(os.path.abspath(__file__))
POLL_SEC = 20
MC_RESOLUTION = 192          # kerapatan mesh; 256 lebih halus tapi ±2x lebih lama di CPU


def load_env():
    env = {}
    with open(os.path.join(HERE, 'worker.env'), encoding='utf-8') as f:
        for line in f:
            if '=' in line and not line.lstrip().startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v
    return env


class Generator:
    def __init__(self):
        torch.set_num_threads(max(1, (os.cpu_count() or 4) - 1))
        t = time.time()
        self.model = TSR.from_pretrained('stabilityai/TripoSR', config_name='config.yaml', weight_name='model.ckpt')
        self.model.renderer.set_chunk_size(8192)
        self.model.to('cpu')
        self.rembg = rembg.new_session()
        print(f'[init] model siap ({time.time() - t:.0f} dtk)', flush=True)

    def to_glb(self, img: Image.Image) -> bytes:
        image = remove_background(img, self.rembg)
        image = resize_foreground(image, 0.85)
        arr = np.array(image).astype(np.float32) / 255.0
        arr = arr[:, :, :3] * arr[:, :, 3:4] + (1 - arr[:, :, 3:4]) * 0.5   # latar abu 50% (format input TripoSR)
        image = Image.fromarray((arr * 255.0).astype(np.uint8))
        with torch.no_grad():
            codes = self.model([image], device='cpu')
        mesh = self.model.extract_mesh(codes, True, resolution=MC_RESOLUTION)[0]
        # TripoSR: sumbu Y model = kedalaman; putar supaya "atas" part = +Y (standar glTF / model-viewer).
        mesh.apply_transform(np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]], dtype=float))
        return mesh.export(file_type='glb')


def run_queue(gen: Generator, env: dict, once: bool):
    base, hdr = env['API_BASE'], {'X-Worker-Key': env['WORKER_KEY']}
    while True:
        try:
            items = requests.get(f'{base}/welding_master/model_queue', headers=hdr, timeout=30).json().get('data', [])
        except Exception as e:
            print(f'[queue] gagal ambil antrean: {e}', flush=True)
            items = []
        for it in items:
            label = f"{it['part_number']} ({it['kind']}, media {it['media_id']})"
            t = time.time()
            try:
                print(f'[job] {label} ← {it["source_url"]}', flush=True)
                src = requests.get(it['source_url'], timeout=60)
                src.raise_for_status()
                glb = gen.to_glb(Image.open(io.BytesIO(src.content)))
                r = requests.post(f'{base}/welding_master/model_upload', params={'media_id': it['media_id']}, headers=hdr,
                                  files={'model': (f"{it['part_id']}.glb", glb, 'model/gltf-binary')}, timeout=120)
                r.raise_for_status()
                print(f'[done] {label} {len(glb) / 1e6:.1f} MB, {time.time() - t:.0f} dtk', flush=True)
            except Exception as e:
                traceback.print_exc()
                try:
                    requests.post(f'{base}/welding_master/model_fail', params={'media_id': it['media_id'], 'message': str(e)[:300]},
                                  headers=hdr, timeout=30)
                except Exception:
                    pass
        if once:
            return
        time.sleep(POLL_SEC)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--once', action='store_true')
    ap.add_argument('--image')
    ap.add_argument('--out', default='test.glb')
    a = ap.parse_args()
    g = Generator()
    if a.image:
        t = time.time()
        data = g.to_glb(Image.open(a.image))
        open(a.out, 'wb').write(data)
        print(f'[test] {a.out} {len(data) / 1e6:.1f} MB, {time.time() - t:.0f} dtk')
        sys.exit(0)
    run_queue(g, load_env(), a.once)
