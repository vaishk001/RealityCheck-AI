const mongoose = require('mongoose');

const ScanLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['url', 'text', 'file'],
      required: true
    },
    input: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ['Safe', 'Suspicious', 'Dangerous'],
      required: true
    },
    reasons: {
      type: [String],
      default: []
    },
    telemetry: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ScanLog', ScanLogSchema);
