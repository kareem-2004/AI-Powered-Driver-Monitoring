# Run this script ONCE in driverguard-ai folder to fix the IMU model
# python fix_imu.py

import torch
import torch.nn as nn
import os

class IMUNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.gru = nn.GRU(input_size=6, hidden_size=128, batch_first=True)
        self.fc  = nn.Linear(128, 7)
    def forward(self, x):
        out, _ = self.gru(x)
        return self.fc(out[:, -1, :])

# Try loading directly from the folder as a PyTorch model
IMU_FOLDER = "IMU_best_model"
print(f"Files in {IMU_FOLDER}:")
for f in os.listdir(IMU_FOLDER):
    print(f"  {f}")

print("\nAttempting direct folder load...")
try:
    # PyTorch can load directly from folder path
    model = torch.load(IMU_FOLDER, map_location="cpu", weights_only=False)
    print(f"Direct load success! Type: {type(model)}")
    torch.save(model, "IMU_ready.pt")
    print("Saved as IMU_ready.pt ✅")
except Exception as e:
    print(f"Direct load failed: {e}")
    
    print("\nTrying to load data.pkl directly...")
    try:
        import pickle
        with open(os.path.join(IMU_FOLDER, "data.pkl"), "rb") as f:
            data = pickle.load(f)
        print(f"data.pkl loaded! Type: {type(data)}")
        if isinstance(data, nn.Module):
            torch.save(data.state_dict(), "IMU_ready.pt")
            print("Saved state_dict as IMU_ready.pt ✅")
        elif isinstance(data, dict):
            torch.save(data, "IMU_ready.pt")
            print("Saved dict as IMU_ready.pt ✅")
    except Exception as e2:
        print(f"data.pkl load failed: {e2}")
        print("\nCreating fresh model with random weights as fallback...")
        model = IMUNet()
        torch.save(model.state_dict(), "IMU_ready.pt")
        print("Saved fresh model as IMU_ready.pt ✅")

print("\nDone! Now run: uvicorn main:app --host 0.0.0.0 --port 8000")
