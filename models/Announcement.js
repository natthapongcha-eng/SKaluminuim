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
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Announcement', announcementSchema);
