const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    customerType: { type: String, enum: ['individual', 'company'], default: 'individual' },
    name: { type: String, required: true },
    companyName: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    notes: { type: String },
    totalProjects: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', customerSchema, 'customers');
