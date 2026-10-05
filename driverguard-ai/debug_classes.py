from ultralytics import YOLO
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import os

model = YOLO("best_fixed.pt")
print(f"Classes: {model.names}")

# Use the PROCESSED frames (already rotated and preprocessed)
frames = [f for f in os.listdir('.') if f.startswith('debug_processed')]
if not frames:
    print("No debug_processed frames found!")
    exit()

for frame_file in sorted(frames):
    print(f"\n--- {frame_file} ---")
    img = Image.open(frame_file).convert("RGB")
    
    # Test with very low confidence
    for conf_thresh in [0.01, 0.05, 0.10]:
        results = model(img, conf=conf_thresh, verbose=False)
        boxes   = results[0].boxes
        if boxes and len(boxes) > 0:
            dets = sorted(
                [(model.names[int(b.cls[0])], round(float(b.conf[0]),3)) for b in boxes],
                key=lambda x: x[1], reverse=True
            )
            print(f"  conf={conf_thresh}: {dets}")
        else:
            print(f"  conf={conf_thresh}: No detections")
    
    # Also try original color version of same frame
    idx = frame_file.replace('debug_processed_','').replace('.jpg','')
    raw = f"debug_frame_{idx}.jpg"
    if os.path.exists(raw):
        from PIL import ExifTags
        img_raw = Image.open(raw).convert("RGB")
        # Fix rotation
        w, h = img_raw.size
        if w > h:
            img_raw = img_raw.rotate(90, expand=True)
        img_raw = img_raw.resize((640, 640))
        results = model(img_raw, conf=0.01, verbose=False)
        boxes   = results[0].boxes
        if boxes and len(boxes) > 0:
            dets = sorted(
                [(model.names[int(b.cls[0])], round(float(b.conf[0]),3)) for b in boxes],
                key=lambda x: x[1], reverse=True
            )
            print(f"  raw_color_rotated conf=0.01: {dets}")
        else:
            print(f"  raw_color_rotated conf=0.01: No detections")
