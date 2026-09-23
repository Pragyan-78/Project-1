from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import io

app = FastAPI(title="Smart AI for Unsighted - Vision Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("yolov8n.pt")
HAZARDS = {"car", "bus", "truck", "motorcycle", "bicycle", "stairs", "chair", "fire hydrant"}

@app.get("/")
def health_check():
    return {"status": "YOLOv8 vision service running"}

@app.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    results = model(image)
    detected_items = []
    obstacles = []

    for r in results:
        for box in r.boxes:
            label = model.names[int(box.cls[0])]
            confidence = float(box.conf[0])
            if confidence >= 0.40:
                detected_items.append({"label": label, "confidence": round(confidence, 2)})
                if label in HAZARDS:
                    obstacles.append(label)

    if not detected_items:
        speech_text = "The path ahead appears clear."
    else:
        unique_labels = list(set([item["label"] for item in detected_items]))
        speech_text = f"In front of you: {', '.join(unique_labels)}."
        if obstacles:
            speech_text += f" Warning: Obstacle detected: {', '.join(set(obstacles))}."

    return {
        "speech_text": speech_text,
        "detections": detected_items,
        "obstacles_detected": len(obstacles) > 0
    }