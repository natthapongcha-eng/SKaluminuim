const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    workHours: { type: Number, default: 0 },
    status: { type: String, enum: ['present', 'late', 'absent', 'leave', 'no_checkout'], default: 'present' },
    note: { type: String },
    updatedBy: { type: String, default: '' },
    adjustedBy: { type: String, default: '' },
    adjustedAt: { type: Date },
    adjustedReason: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

// Compound index for unique user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema, 'attendances');
