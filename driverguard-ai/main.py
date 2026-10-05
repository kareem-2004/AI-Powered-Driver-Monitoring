import os, io, base64, numpy as np
import torch, torch.nn as nn, joblib, pandas as pd
from collections import deque
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ExifTags
from ultralytics import YOLO

app = FastAPI(title="DriverGuard AI Server v2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─── IMU Model ────────────────────────────────────────────────────────────────
class IMUNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.gru = nn.GRU(input_size=6, hidden_size=128, batch_first=True)
        self.fc  = nn.Linear(128, 7)
    def forward(self, x):
        out, _ = self.gru(x)
        return self.fc(out[:, -1, :])

# ─── Load models ─────────────────────────────────────────────────────────────
print("Loading YOLO model...")
yolo_model = YOLO("best_fixed.pt")
print(f"✅ YOLO Classes: {yolo_model.names}")

print("Loading IMU model...")
imu_model  = IMUNet()
IMU_LOADED = False
if os.path.exists("IMU_ready.pt"):
    try:
        ckpt = torch.load("IMU_ready.pt", map_location="cpu", weights_only=False)
        if isinstance(ckpt, dict):        imu_model.load_state_dict(ckpt)
        elif isinstance(ckpt, nn.Module): imu_model = ckpt
        IMU_LOADED = True
        print("✅ IMU loaded!")
    except Exception as e: print(f"⚠️ IMU: {e}")
imu_model.eval()

style_model = joblib.load("driving_style_model.pkl")
fuel_model  = joblib.load("fuel_model.pkl")
print("\n🚀 All models ready!\n")

# ─── Labels ───────────────────────────────────────────────────────────────────
# Must match training label_to_int order exactly
IMU_LABELS = [
    "normal_driving",
    "harsh_brake",
    "sudden_accelerate",
    "turning_left",
    "turning_right",
    "lane_change_left",
    "lane_change_right",
]

ALERT_STATES = ["DangerousDriving", "Distracted", "SleepyDriving"]

# Exact feature names from model.feature_names_in_ — DO NOT CHANGE ORDER
STYLE_FEATURES = [
    "speed_kmh","acceleration_ms2","rpm","throttle_pct","fuel_rate_lph",
    "maf_kg_h","coolant_temp_c","boost_psi",
    "speed_kmh_mean5s","speed_kmh_max5s","speed_kmh_std5s",
    "acceleration_ms2_mean5s","acceleration_ms2_max5s","acceleration_ms2_std5s",
    "rpm_mean5s","rpm_max5s","rpm_std5s",
    "fuel_rate_lph_mean5s","fuel_rate_lph_max5s","fuel_rate_lph_std5s",
    "throttle_pct_mean5s","throttle_pct_max5s","throttle_pct_std5s",
    "speed_change_per_sec","rpm_per_speed","is_idle",
]
# Fuel model was trained WITH label column — 14 features total
FUEL_FEATURES = [
    "speed_kmh","acceleration_ms2","rpm","throttle_pct","maf_kg_h",
    "coolant_temp_c","boost_psi","is_idle",
    "speed_kmh_mean5s","rpm_mean5s","throttle_pct_mean5s",
    "rpm_per_speed","speed_change_per_sec","label",
]

# ─── YOLO smoothing ───────────────────────────────────────────────────────────
WINDOW_SIZE  = 2
yolo_history = deque(maxlen=WINDOW_SIZE)

def fix_rotation(img: Image.Image) -> Image.Image:
    try:
        exif = img._getexif()
        if exif:
            for tag, value in exif.items():
                if ExifTags.TAGS.get(tag) == 'Orientation':
                    if value == 3:   img = img.rotate(180, expand=True)
                    elif value == 6: img = img.rotate(270, expand=True)
                    elif value == 8: img = img.rotate(90,  expand=True)
                    break
    except: pass
    w, h = img.size
    if w > h:
        img = img.rotate(90, expand=True)
    return img

def preprocess(img: Image.Image) -> Image.Image:
    img = fix_rotation(img.convert("RGB"))
    return img.resize((640, 640), Image.LANCZOS)

def smooth_prediction(state: str, conf: float):
    if conf > 0.05:
        yolo_history.append((state, conf))
    if len(yolo_history) < 1:
        return state, conf, False
    counts: dict = {}
    for s, c in yolo_history:
        if s not in counts: counts[s] = []
        counts[s].append(c)
    best = max(counts, key=lambda s: len(counts[s]))
    avg  = sum(counts[best]) / len(counts[best])
    n    = len(counts[best])
    high_conf    = best in ALERT_STATES and avg >= 0.60
    consecutive  = best in ALERT_STATES and n >= 2
    should_alert = high_conf or consecutive
    print(f"  Smooth: {best} ({avg:.2f}) x{n} | alert={should_alert}")
    return best, round(avg, 3), should_alert

def run_yolo(img: Image.Image):
    processed = preprocess(img)
    results   = yolo_model(processed, conf=0.08, verbose=False)
    boxes     = results[0].boxes
    state     = "SafeDriving"
    best_conf = 0.0
    detections = []
    if boxes is not None and len(boxes) > 0:
        for box in boxes:
            cls_id = int(box.cls[0].item())
            conf   = float(box.conf[0].item())
            label  = yolo_model.names.get(cls_id, "SafeDriving")
            detections.append({"label": label, "confidence": round(conf, 3)})
            if conf > best_conf:
                best_conf = conf
                state     = label
    print(f"  Raw: {state} ({best_conf:.3f}) | {len(detections)} det")
    return state, round(best_conf, 3), detections

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "running", "imu_trained": IMU_LOADED, "yolo_classes": yolo_model.names}

@app.post("/imu/predict")
async def imu_predict(data: dict):
    features = data.get("features", [])
    if len(features) != 6:
        return {"success": False, "event": "normal_driving"}
    if IMU_LOADED:
        try:
            tensor = torch.tensor([[features]], dtype=torch.float32)
            with torch.no_grad():
                output = imu_model(tensor)
                cls_id = torch.argmax(output, dim=1).item()
                probs  = torch.softmax(output, dim=1)[0].tolist()
            label = IMU_LABELS[cls_id] if cls_id < len(IMU_LABELS) else "normal_driving"
            return {
                "success": True, "event": label, "class_id": cls_id,
                "probabilities": {IMU_LABELS[i]: round(p, 3) for i, p in enumerate(probs)},
                "source": "imu_model"
            }
        except Exception as e:
            print(f"IMU model error: {e}")

    # Rule-based fallback
    ax_raw, ay_raw, az, gx_raw, gy_raw, gz_raw = features
    ax = ay_raw
    ay = -ax_raw
    gz = gz_raw

    # Phone flat check (az ≈ 1 means lying flat)
    if abs(az) > 0.7:
        return {"success": True, "event": "normal_driving", "probabilities": {}, "source": "rule_based"}

    event = "normal_driving"
    if abs(ay) > 1.5 and gz >  0.5: event = "lane_change_left"
    elif abs(ay) > 1.5 and gz < -0.5: event = "lane_change_right"
    elif gz >  0.4: event = "turning_left"
    elif gz < -0.4: event = "turning_right"
    elif ax < -1.5: event = "harsh_brake"
    elif ax >  1.5: event = "sudden_accelerate"

    return {"success": True, "event": event, "probabilities": {}, "source": "rule_based"}

@app.post("/yolo/detect")
async def yolo_detect(file: UploadFile = File(...)):
    try:
        img = Image.open(io.BytesIO(await file.read()))
        raw_state, raw_conf, dets = run_yolo(img)
        smooth_state, smooth_conf, should_alert = smooth_prediction(raw_state, raw_conf)
        return {"success": True, "driverState": smooth_state, "confidence": smooth_conf,
                "rawState": raw_state, "detections": dets, "shouldAlert": should_alert}
    except Exception as e:
        return {"success": False, "error": str(e), "driverState": "SafeDriving", "shouldAlert": False}

@app.post("/yolo/detect_base64")
async def yolo_detect_b64(data: dict):
    try:
        b64 = data.get("image", "")
        if not b64: return {"success": False, "driverState": "SafeDriving"}
        if "," in b64: b64 = b64.split(",")[1]
        img = Image.open(io.BytesIO(base64.b64decode(b64)))
        raw_state, raw_conf, dets = run_yolo(img)
        smooth_state, smooth_conf, should_alert = smooth_prediction(raw_state, raw_conf)
        return {"success": True, "driverState": smooth_state, "confidence": smooth_conf,
                "rawState": raw_state, "detections": dets, "shouldAlert": should_alert}
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"success": False, "error": str(e), "driverState": "SafeDriving", "shouldAlert": False}

@app.post("/driving/style")
async def driving_style(data: dict):
    try:
        # Use DataFrame with correct feature names to avoid sklearn warning
        features   = pd.DataFrame([data["features"]], columns=STYLE_FEATURES)
        prediction = style_model.predict(features)[0]
        confidence = None
        if hasattr(style_model, "predict_proba"):
            proba      = style_model.predict_proba(features)[0]
            confidence = round(float(max(proba)), 3)
        return {
            "success": True,
            "style": str(prediction),
            "confidence": confidence,
            "isAggressive": str(prediction).lower() == "aggressive"
        }
    except Exception as e:
        return {"success": False, "error": str(e), "style": "Normal", "isAggressive": False}

@app.post("/driving/fuel")
async def fuel_estimate(data: dict):
    try:
        raw = list(data.get("features", []))
        # Fuel model needs exactly 14 features including label — add 0 if missing
        if len(raw) == 13:
            raw = raw + [0]
        elif len(raw) != 14:
            return {"success": False, "error": f"Expected 13 or 14 features, got {len(raw)}", "fuel_estimate": None}
        features   = pd.DataFrame([raw], columns=FUEL_FEATURES)
        prediction = fuel_model.predict(features)[0]
        value = max(0.1, float(prediction))  # never return negative fuel
        print(f"[FUEL] prediction={round(value,4)} L/h")
        return {"success": True, "fuel_estimate": round(value, 4)}
    except Exception as e:
        print(f"[FUEL ERROR] {e}")
        return {"success": False, "error": str(e), "fuel_estimate": None}
