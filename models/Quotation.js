const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    pricePerUnit: { type: Number, required: true },
    total: { type: Number, required: true },
    profitPerUnit: { type: Number, default: 0 }
});

const quotationSchema = new mongoose.Schema({
    quotationNumber: { type: String, required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true },
    customerAddress: { type: String },
    customerPhone: { type: String },
    items: [quotationItemSchema],
    subtotal: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalNetPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'sent', 'approved', 'rejected'], default: 'draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('Quotation', quotationSchema, 'quotations');
