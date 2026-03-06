const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    createdBy: {
        type: String,
        default: 'System'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    startAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    endAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

announcementSchema.index({ isActive: 1, startAt: 1, endAt: 1, updatedAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
