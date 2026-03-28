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
    // stage: ขั้นตอนการติดตั้ง (before=ก่อนติดตั้ง, during=ระหว่างติดตั้ง, after=หลังติดตั้ง)
    stage: { 
        type: String, 
        enum: ['before', 'during', 'after'], 
        required: function requiredStage() {
            return this.mediaType !== 'quotation';
        },
        default: 'after'
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: function requiredProjectId() {
            return this.mediaType !== 'quotation';
        }
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation',
        required: function requiredQuotationId() {
            return this.mediaType === 'quotation';
        }
    },
    description: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

mediaSchema.pre('validate', function enforceStageByMediaType() {
    if (this.mediaType === 'quotation') {
        this.stage = undefined;
    } else if (!this.stage) {
        this.stage = 'after';
    }
});

// Index for faster queries by project and stage
mediaSchema.index({ projectId: 1, stage: 1 });
mediaSchema.index({ quotationId: 1, createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema, 'medias');
