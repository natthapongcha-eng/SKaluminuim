const mongoose = require('mongoose');

const stockLogSchema = new mongoose.Schema({
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    itemName: { type: String, required: true },
    type: { type: String, enum: ['in', 'out'], required: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    reason: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StockLog', stockLogSchema, 'stocklogs');
