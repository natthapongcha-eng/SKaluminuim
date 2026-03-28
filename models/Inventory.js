const mongoose = require('mongoose');

// Schema ตรงกับ collection 'materials' ใน MongoDB
const materialSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['NEW', 'SCRAP'], default: 'NEW' },
    quantity: { type: Number, default: 0 },
    // new manual fields
    specification: { type: String }, // ขนาด/รายละเอียดเพิ่มเติม
    unit: { type: String, default: 'ชิ้น' },
    minimumThreshold: { type: Number, default: 10 },
    unitPrice: { type: Number, default: 0 },
    location: { type: String },
    lastUpdated: { type: Date, default: Date.now }
});

// ใช้ collection 'materials' ที่มีอยู่แล้ว
module.exports = mongoose.model('Material', materialSchema, 'materials');
/*
Model Name: Customer
Collection Name: customers
module.exports = ส่งออก Model นี้ให้ไฟล์อื่น import ไปใช้ได้
*/