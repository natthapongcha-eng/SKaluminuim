# ระบบบริหารจัดการธุรกิจกระจกและอลูมิเนียม กัส
# SK Aluminium - Glass & Aluminum Business Management System

![SK Aluminium](https://img.shields.io/badge/Version-1.0.0-blue)
![Status](https://img.shields.io/badge/Status-Development-yellow)

## 📋 Overview

ระบบบริหารจัดการธุรกิจกระจกและอลูมิเนียม เป็น Web Application สำหรับธุรกิจรับติดตั้งกระจกและอลูมิเนียม โดยมุ่งเน้นการจัดการคลังวัสดุ การคำนวณต้นทุนและกำไรโครงการ การจัดการลูกค้า และระบบรายงานเชิงวิเคราะห์

## 🎯 Key Features

### 1. Authentication Module
- ✅ Login ด้วย Email + Password
- ✅ JWT Authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ CEO และ Employee roles

### 2. Inventory Management
- ✅ จัดการวัสดุใหม่และเศษวัสดุเหลือใช้
- ✅ บันทึกการรับเข้าและเบิกออก
- ✅ แจ้งเตือนวัสดุใกล้หมด
- ✅ ระบบค้นหาและกรอง

### 3. Project & Sales Management
- ✅ สร้างและจัดการโครงการ
- ✅ คำนวณต้นทุนและกำไรอัตโนมัติ
- ✅ บันทึกสถานะการชำระเงิน
- ✅ ออกใบเสนอราคา

### 4. Customer Management (CEO Only)
- ✅ เพิ่ม แก้ไข ลบข้อมูลลูกค้า
- ✅ รองรับทั้งบุคคลทั่วไปและนิติบุคคล
- ✅ ติดตามประวัติโครงการ

### 5. Employee Attendance
- ✅ บันทึกเวลาเข้า-ออกงาน
- ✅ ตรวจสอบการมาสาย
- ✅ สรุปเวลาทำงานรายเดือน
- ✅ ปฏิทินการเข้างาน

### 6. Media Management
- ✅ อัปโหลดรูปก่อน-หลังติดตั้ง
- ✅ จัดเก็บแยกตามโครงการ
- ✅ ระบบ Drag & Drop

### 7. Reports & Analytics (CEO Only)
- ✅ รายงานรายได้และกำไร
- ✅ รายงานสรุปโครงการ
- ✅ รายงานวัสดุคงเหลือ
- ✅ รายงานการทำงานพนักงาน

## 🏗️ System Architecture

```
Frontend:  HTML5, CSS3, JavaScript (Vanilla)
Backend:   Node.js + Express.js (ยังไม่ได้ติดตั้ง)
Database:  MongoDB Atlas (ยังไม่ได้เชื่อมต่อ)
Deploy:    Railway (ยังไม่ได้ Deploy)
```

## 📂 Project Structure

```
SKaluminuim/
├── index.html              # หน้า Login
├── dashboard.html          # หน้า Dashboard/Homepage
├── quotation.html          # หน้าใบเสนอราคา
├── inventory.html          # หน้าจัดการคลังวัสดุ
├── projects.html           # หน้าจัดการโครงการ
├── customers.html          # หน้าจัดการลูกค้า (CEO Only)
├── attendance.html         # หน้าบันทึกเวลาเข้า-ออก
├── media.html              # หน้าจัดการรูปภาพ
├── reports.html            # หน้ารายงาน (CEO Only)
├── css/
│   └── style.css          # ไฟล์ CSS หลัก
└── js/
    └── main.js            # ไฟล์ JavaScript หลัก
```

## 🚀 Getting Started

### Prerequisites

- ไม่ต้องติดตั้งอะไรเพิ่มเติม สามารถเปิดไฟล์ HTML ได้เลย
- สำหรับ Backend (ในอนาคต):
  - Node.js (LTS version)
  - MongoDB Atlas Account
  - Railway Account

### Installation

1. Clone repository
```bash
git clone https://github.com/yourusername/skaluminuim.git
cd SKaluminuim
```

2. เปิดไฟล์ index.html ในเว็บเบราว์เซอร์
```bash
# หรือใช้ Live Server extension ใน VS Code
```

### Demo Login Credentials

**CEO Account:**
- Email: ceo@skaluminium.com
- Password: (ใส่อะไรก็ได้)
- Role: CEO

**Employee Account:**
- Email: employee@skaluminium.com
- Password: (ใส่อะไรก็ได้)
- Role: Employee

## 👥 User Roles

### CEO (ผู้บริหาร)
- ✅ เข้าถึงทุกฟีเจอร์
- ✅ เห็น Dashboard รายงาน
- ✅ จัดการข้อมูลลูกค้า
- ✅ ดูสรุปรายได้และกำไร

### Employee (พนักงาน)
- ✅ จัดการคลังวัสดุ
- ✅ จัดการโครงการ
- ✅ บันทึกเวลาเข้า-ออกงาน
- ✅ อัปโหลดรูปภาพ
- ❌ ไม่สามารถเข้าถึงข้อมูลลูกค้า
- ❌ ไม่สามารถดูรายงาน

## 🎨 Design System

### Color Palette
- **Primary Blue:** `#1e40af` - สีน้ำเงินหลักของแบรนด์
- **Accent Blue:** `#2563eb` - สีน้ำเงินเสริม
- **Success:** `#10b981` - สีเขียว (สำเร็จ)
- **Warning:** `#f59e0b` - สีเหลือง (คำเตือน)
- **Danger:** `#ef4444` - สีแดง (ข้อผิดพลาด)

### Typography
- **Font Family:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto

### Components
- ✅ Modern Card Design
- ✅ Smooth Animations
- ✅ Responsive Layout
- ✅ Interactive Elements

## 📱 Responsive Design

ระบบรองรับการแสดงผลบนอุปกรณ์ต่างๆ:
- 💻 Desktop (1920px+)
- 💻 Laptop (1366px - 1920px)
- 📱 Tablet (768px - 1366px)
- 📱 Mobile (< 768px)

## 🔒 Security Features

- ✅ Password Hashing (bcrypt) - ยังไม่ได้ implement
- ✅ JWT Authentication - ยังไม่ได้ implement
- ✅ Role-Based Access Control (RBAC) - UI ทำแล้ว
- ✅ Input Validation - ยังไม่ครบ
- ✅ XSS Protection - ยังไม่ได้ implement

## 🔄 Current Status

### ✅ Completed (Frontend UI)
- [x] Login Page
- [x] Dashboard/Homepage
- [x] Quotation System
- [x] Inventory Management UI
- [x] Projects Management UI
- [x] Customer Management UI
- [x] Attendance System UI
- [x] Media Gallery UI
- [x] Reports & Analytics UI
- [x] Role-Based UI (CEO/Employee)
- [x] Responsive Design
- [x] Animations & Interactions

### 🚧 In Progress
- [ ] Backend API Development
- [ ] MongoDB Integration
- [ ] Authentication System
- [ ] File Upload System
- [ ] Data Persistence

### 📋 To Do
- [ ] Deploy to Railway
- [ ] PWA Support
- [ ] Real-time Notifications
- [ ] PDF Export
- [ ] Excel Export
- [ ] Chart.js Integration
- [ ] Email Notifications
- [ ] Backup System

## 🛠️ Next Steps

### Phase 1: Backend Setup (ยังไม่ได้ทำ)
```bash
# ติดตั้ง dependencies
npm install express mongoose dotenv cors bcrypt jsonwebtoken

# สร้าง server.js
# เชื่อมต่อ MongoDB Atlas
# สร้าง API endpoints
```

### Phase 2: Integration
- เชื่อมต่อ Frontend กับ Backend
- ทดสอบระบบทั้งหมด
- แก้ไข bugs

### Phase 3: Deployment
- Deploy Backend บน Railway
- ตั้งค่า Environment Variables
- ทดสอบ Production

## 📚 Documentation

### API Endpoints (จะสร้างในอนาคต)

```
POST   /api/auth/login          - Login
POST   /api/auth/register       - Register (CEO only)

GET    /api/inventory           - Get all materials
POST   /api/inventory           - Add material
PUT    /api/inventory/:id       - Update material
DELETE /api/inventory/:id       - Delete material

GET    /api/projects            - Get all projects
POST   /api/projects            - Create project
PUT    /api/projects/:id        - Update project
DELETE /api/projects/:id        - Delete project

GET    /api/customers           - Get all customers (CEO only)
POST   /api/customers           - Add customer (CEO only)
PUT    /api/customers/:id       - Update customer (CEO only)
DELETE /api/customers/:id       - Delete customer (CEO only)

GET    /api/attendance          - Get attendance records
POST   /api/attendance/checkin  - Check in
POST   /api/attendance/checkout - Check out

POST   /api/media/upload        - Upload media
GET    /api/media/project/:id   - Get project media

GET    /api/reports/revenue     - Get revenue report (CEO only)
GET    /api/reports/projects    - Get projects report (CEO only)
GET    /api/reports/inventory   - Get inventory report (CEO only)
GET    /api/reports/attendance  - Get attendance report (CEO only)
```

## 🤝 Contributing

ยังไม่เปิดรับ contributions ในขณะนี้

## 📄 License

Private Project - All Rights Reserved

## 📞 Contact

- **Company:** SK Aluminium
- **Email:** contact@skaluminium.com
- **Phone:** +66 (0) XX-XXX-XXXX

## 🙏 Acknowledgments

- Designed with inspiration from modern web applications
- Icons from Unicode Emoji
- Placeholder images from placeholder.com

---

**Version:** 1.0.0 (Frontend UI Only)  
**Last Updated:** February 2026  
**Status:** Frontend Complete - Backend Pending
