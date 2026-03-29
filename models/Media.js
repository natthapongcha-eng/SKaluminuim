const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    mediaType: {
        type: String,
        enum: ['project', 'quotation'],
        default: 'project'
    },
    path: { type: String, default: '' },
    imageData: { type: Buffer },
    storageType: {
        type: String,
        enum: ['database', 'filesystem'],
        default: 'database'
    },
    stage: { 
        type: String, 
        enum: ['before', 'during', 'after'], 
        required: function () {
            return this.mediaType !== 'quotation';
        },
        default: 'after'
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: function () {
            return this.mediaType !== 'quotation';
        }
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation',
        required: function () {
            return this.mediaType === 'quotation';
        }
    },
    description: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

// ✅ แก้ conflict ตรงนี้
mediaSchema.pre('validate', function () {
    if (this.mediaType === 'quotation') {
        this.stage = undefined;
    } else if (!this.stage) {
        this.stage = 'after';
    }
});

// Index
mediaSchema.index({ projectId: 1, stage: 1 });
mediaSchema.index({ quotationId: 1, createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema, 'medias');