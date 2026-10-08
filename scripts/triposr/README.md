# Worker model 3D (TripoSR)

Generates 3D `.glb` models of parts and pallets from their photos. Runs on a dev PC (CPU is fine: about 20–60 s per model).

## Setup (Windows, Python 3.13)

```
git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR.git D:\Efrino\tools\triposr
cd D:\Efrino\tools\triposr
python -m venv .venv
.venv\Scripts\pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\pip install omegaconf einops "transformers<4.50" trimesh huggingface-hub PyMCubes pillow rembg onnxruntime requests
copy <repo>\scripts\triposr\worker.py .
```

- `torchmcubes` needs a C++/CUDA build. Replace it with PyMCubes in `tsr/models/isosurface.py`: a `marching_cubes(level, threshold)` wrapper around `mcubes.marching_cubes`, with vertex order `[2,1,0]` and face order `[0,2,1]`.
- Create `worker.env` (do not commit it):
  - `API_BASE=http://192.168.10.67/majsf_rest_api/api`
  - `WORKER_KEY=<model_worker_key from application/config/ai.php on the server>`
- On first run the TripoSR model (~1.7 GB) and the rembg model (~1 GB) are downloaded.

## Run

```
.venv\Scripts\python worker.py
```

The worker checks the queue every 20 s. Use `--once` to process the queue a single time. Use `--image foto.png --out x.glb` for a local test.

## Flow

1. "Generate 3D" in Master Data (part detail) calls `model_request`. This adds a `ms_welding_media` row with `media_type='model'` and `file_path=''` (queued).
2. The worker calls `model_queue`, removes the background, builds the mesh with TripoSR, then calls `model_upload` (`.glb`). On failure it calls `model_fail`, which removes the row from the queue.
3. The page loads the model through `model_file` (CORS headers come from the API; Apache `mod_headers` is not active).
