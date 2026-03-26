const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true }, // required: true บังคับให้ต้องมีค่า, unique: true บังคับให้ค่าไม่ซ้ำกัน
    password: { type: String, required: true },
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    profileImage: { type: String, default: '' },
    name: { type: String }, // ไม่บังคับให้ต้องมีค่า
    role: { type: String, enum: ['CEO', 'ADMIN', 'EMPLOYEE'], default: 'EMPLOYEE' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema, 'users');
