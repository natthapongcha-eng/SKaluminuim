const mongoose = require('mongoose');

const projectMaterialSchema = new mongoose.Schema({
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Material',
        required: true
    },
    name: { type: String, required: true }, // required: true ห้ามปล่อยว่าง
    specification: { type: String, default: '' },
    unit: { type: String, default: '' },
    qty: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
}, { _id: false });

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation',
        default: null
    },
    totalCost: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    quotedNetPrice: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid'
    },
    status: {
        type: String,
        enum: ['planning', 'in-progress', 'completed', 'cancelled'],
        default: 'planning'
    },
    team: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String },
    materials: { type: [projectMaterialSchema], default: [] },
    stockDeducted: { type: Boolean, default: false },
    stockDeductedAt: { type: Date },
    stockRestored: { type: Boolean, default: false },
    stockRestoredAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

projectSchema.virtual('customer', {
    ref: 'Customer',
    localField: 'customerId',
    foreignField: '_id',
    justOne: true
});

projectSchema.set('toJSON', { virtuals: true, versionKey: false });
projectSchema.set('toObject', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Project', projectSchema, 'projects');
