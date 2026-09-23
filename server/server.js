require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const connectDB = require('./config/db');
const Alert = require('./models/Alert');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

connectDB();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

app.post('/api/vision/process-frame', upload.single('frame'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No camera frame provided.' });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/detect`, form, {
      headers: { ...form.getHeaders() }
    });

    const { speech_text, detections, obstacles_detected } = aiResponse.data;

    if (obstacles_detected) {
      await Alert.create({
        alertType: 'Obstacle',
        message: speech_text,
        detectedObjects: detections.map(d => d.label)
      });
    }

    return res.status(200).json({
      success: true,
      speechText: speech_text,
      detections,
      alert: obstacles_detected
    });
  } catch (error) {
    console.error('Vision inference error:', error.message);
    res.status(500).json({ error: 'Vision processing failed', details: error.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(20);
    res.status(200).json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));