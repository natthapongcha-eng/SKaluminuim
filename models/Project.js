const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Customer', 
        required: true 
    },
    name: { type: String, required: true },
    team: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    totalCost: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    paymentStatus: { 
        type: String, 
        enum: ['unpaid', 'partial', 'paid'], 
        default: 'unpaid' 
    },
    status: { 
        type: String, 
        enum: ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น', 'ยกเลิก'], 
        default: 'รอดำเนินการ' 
    },
    budget: { type: Number, default: 0 },
    assignedTeam: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Virtual to populate customer name
projectSchema.virtual('customer', {
    ref: 'Customer',
    localField: 'customerId',
    foreignField: '_id',
    justOne: true
});

projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema, 'projects');
