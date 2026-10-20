"""
One-time conversion of the YOLOv8 leaf detector to ONNX, so the service runs on onnxruntime +
OpenCV without PyTorch. Needs `pip install ultralytics onnx` (build stage only).

  python scripts/export_yolo.py <path/to/best.pt> <output-dir>

Writes plant-leaf.onnx and plant-leaf.classes.json into <output-dir>.
"""

import json
import shutil
import sys
from pathlib import Path

from ultralytics import YOLO

source, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)

model = YOLO(str(source))
names = model.names
classes = [names[i] for i in range(len(names))] if isinstance(names, dict) else list(names)
onnx_path = Path(model.export(format="onnx", imgsz=640, opset=17, simplify=False, dynamic=False))

shutil.move(str(onnx_path), out_dir / "plant-leaf.onnx")
(out_dir / "plant-leaf.classes.json").write_text(json.dumps(classes, ensure_ascii=False), encoding="utf-8")
print(f"exported {len(classes)} classes to {out_dir}")
