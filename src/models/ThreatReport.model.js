const mongoose = require('mongoose');

const THREAT_TYPES = [
  'Phishing',
  'Malware',
  'Social Engineering',
  'Fake Payment',
  'Job Scam',
  'Crypto Scam'
];

const ThreatReportSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 5000
    },
    threatType: {
      type: String,
      required: true,
      enum: THREAT_TYPES
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    votes: {
      type: Number,
      default: 1,
      min: 0,
      index: true
    },
    contentHash: {
      type: String,
      required: true,
      index: true
    },
    reporterKeys: {
      type: [String],
      default: [],
      select: false
    },
    voterKeys: {
      type: [String],
      default: [],
      select: false
    }
  },
  {
    timestamps: true
  }
);

ThreatReportSchema.index({ threatType: 1, votes: -1, createdAt: -1 });
ThreatReportSchema.index({ contentHash: 1, threatType: 1, createdAt: -1 });

module.exports = {
  ThreatReport: mongoose.model('ThreatReport', ThreatReportSchema),
  THREAT_TYPES
};
