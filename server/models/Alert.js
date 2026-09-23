const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  userId: { type: String, default: 'unsighted_default_user' },
  alertType: { type: String, enum: ['Obstacle', 'Emergency', 'General'], required: true },
  message: { type: String, required: true },
  detectedObjects: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', AlertSchema);