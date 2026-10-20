# ChhadKrishi ML service

A small CPU-only API that the Next.js server calls. Sized to run on **Render's free plan
(512 MB RAM, 0.1 CPU)**: about 275 MB of RAM at peak.

| Route | What | Model |
|---|---|---|
| `POST /tts` | Reads chat answers aloud | Microsoft Azure neural voices `bn-BD-NabanitaNeural` / `en-IN-NeerjaNeural` through [`edge-tts`](https://github.com/rany2/edge-tts) — no Azure key, no model download |
| `POST /vision/analyze` | Photo quality, leaf detection and leaf-colour measurements for Image Analysis | [`foduucom/plant-leaf-detection-and-classification`](https://huggingface.co/foduucom/plant-leaf-detection-and-classification) (YOLOv8s → ONNX, 44 MB, in `models/`) + OpenCV |
| `GET /health` | Health check | – |

Everything except `/health` needs `Authorization: Bearer <ML_SERVICE_TOKEN>`. Only the Next.js
server knows the token; browsers never talk to this service.

**Voice input is not here.** A Whisper model needs about 2 GB of RAM, which does not fit on a
512 MB host. The chat mic uses Whisper large-v3 on Groq when `GROQ_API_KEY` is set in the
website, and the browser's own speech recognition otherwise. Read-aloud goes straight to the
official Azure Speech API when `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` are set in the website,
and to this service otherwise.

## What the vision step does (and doesn't)

- **OpenCV** checks sharpness (variance of the Laplacian) and exposure, then measures the share
  of green, yellow, brown and pale tissue inside the detected leaves (HSV thresholds) and counts
  small dark spots on green tissue.
- **YOLO** locates leaves. Its crop-name labels are *not* used: on real photos they are often
  wrong (it called an ornamental shrub "gram" at 86%).
- These numbers are passed to the vision LLM as evidence and shown in a "Computer-vision check"
  card. They make the diagnosis better grounded; they are not a diagnosis by themselves and no
  model here can honestly promise "99% accuracy" on gardeners' phone photos. Published 99% figures
  come from lab datasets (PlantVillage: one leaf, plain background) and drop sharply in the field.

## Free-plan behaviour to expect

- **Sleeps after 15 min idle.** The first request afterwards waits about a minute for a cold
  start. Photo analysis gives the vision step 25 s and then carries on without it, so a cold start
  costs you the "Computer-vision check" card for that one photo, not the analysis. Read-aloud
  shows an error on that first press; pressing again works.
- **0.1 CPU is slow.** One photo takes about 0.5 s on a full core, so expect roughly 5–10 s here.

## Run locally (Windows)

A virtualenv with everything installed is at `D:\ChhadKrishi-models\venv`:

```powershell
cd D:\ChhadKrishi-models
$env:ML_SERVICE_TOKEN = "any-long-random-string"
.\venv\Scripts\python -m uvicorn --app-dir D:\ChhadKrishi\ml-service app:app --port 8765
```

Then in the app's `.env.local`:

```
ML_SERVICE_URL=http://127.0.0.1:8765
ML_SERVICE_TOKEN=any-long-random-string
```

Elsewhere: `pip install -r requirements.txt` and run `python app.py` from this folder.

## Deploy on Render (free plan)

1. Push this repo to GitHub.
2. Render → **New → Web Service** → pick the repo.
3. **Root Directory:** `ml-service` · **Language:** Docker (it finds the `Dockerfile`) ·
   **Instance Type:** Free.
4. **Environment variable:** `ML_SERVICE_TOKEN` = a long random string
   (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`).
5. **Health Check Path:** `/health`. Deploy (the first build takes a few minutes).
6. In Vercel → Project → Settings → Environment Variables:
   `ML_SERVICE_URL=https://<your-service>.onrender.com` (no trailing slash) and the same
   `ML_SERVICE_TOKEN`. Redeploy.

## Notes

- **Licence of the YOLO weights:** the model card states no licence, and Ultralytics treats
  YOLOv8-trained weights as AGPL-3.0. Serving them over a network is fine if this service's source
  stays available (e.g. a public repo); for a closed-source commercial product, get an Ultralytics
  Enterprise licence or train your own detector with a permissive architecture.
- `edge-tts` uses Microsoft's public read-aloud endpoint (the voices Azure sells), so it needs
  outbound internet and has no SLA. If it ever stops working, the "Listen" button shows an error
  and the rest of the app is unaffected.
- To re-export the YOLO model: `pip install ultralytics onnx`, then
  `python scripts/export_yolo.py <path/to/best.pt> models`.
