const mongoose = require('mongoose');

const projectMaterialSchema = new mongoose.Schema({
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Material',
        required: true
    },
    name: { type: String, required: true },
    specification: { type: String, default: '' },
    unit: { type: String, default: '' },
    qty: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
}, { _id: false });

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    totalCost: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
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
    budget: { type: Number, default: 0 },
    assignedTeam: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    description: { type: String },
    materials: {
        type: [projectMaterialSchema],
        default: []
    },
    createdAt: { type: Date, default: Date.now }
});

projectSchema.virtual('customer', {
    ref: 'Customer',
    localField: 'customerId',
    foreignField: '_id',
    justOne: true
});

projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema, 'projects');
