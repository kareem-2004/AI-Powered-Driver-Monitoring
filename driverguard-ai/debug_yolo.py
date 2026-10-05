# Run this to debug what YOLO sees
# python debug_yolo.py
from ultralytics import YOLO
from PIL import Image, ImageOps
import base64, os

model = YOLO("best_fixed.pt")
print(f"Classes: {model.names}")
print(f"Model task: {model.task}")

# Test with different confidence levels
print("\n--- Testing with confidence 0.01 ---")

# If you have a saved test image
if os.path.exists("test_frame.jpg"):
    results = model("test_frame.jpg", conf=0.01, verbose=True)
    boxes = results[0].boxes
    print(f"Detections at conf=0.01: {len(boxes) if boxes else 0}")
    if boxes and len(boxes) > 0:
        for box in boxes:
            cls_id = int(box.cls[0].item())
            conf   = float(box.conf[0].item())
            print(f"  {model.names[cls_id]}: {conf:.3f}")
    results[0].save("debug_result.jpg")
    print("Saved debug_result.jpg")
else:
    print("No test_frame.jpg found")
    print("Creating a test with webcam...")
    import cv2
    cap = cv2.VideoCapture(0)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret:
            cv2.imwrite("test_frame.jpg", frame)
            print("Captured test_frame.jpg — run again!")
        cap.release()
    else:
        print("No webcam available")

# Also test model info
print("\n--- Model Info ---")
print(f"Model type: {type(model.model)}")
try:
    print(f"Input size: {model.model.args}")
except: pass
