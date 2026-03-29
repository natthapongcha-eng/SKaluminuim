# MongoDB Query Reference — SK Aluminium System

> เอกสารนี้รวบรวม **MongoDB queries ทั้งหมด** ที่ระบบใช้งานจริงในหน้า Inventory, Projects และ Reports
> แบ่งตาม **ฟีเจอร์/การกระทำ** พร้อมระบุ **ไฟล์** และ **บรรทัดที่แน่นอน** ในโปรเจกต์

---

## ⚠️ สิ่งสำคัญก่อนอ่าน — Model Name vs Collection Name

Script ใน Node.js ใช้ชื่อ **Model (PascalCase)** แต่ใน MongoDB Compass / mongosh shell ใช้ชื่อ **Collection (lowercase)**

```
Node.js (routes/*.js)           mongosh / MongoDB Compass Shell
──────────────────────          ────────────────────────────────
Material.find(...)         →    db.materials.find(...)
StockLog.find(...)         →    db.stocklogs.find(...)
Project.find(...)          →    db.projects.find(...)
Quotation.find(...)        →    db.quotations.find(...)
Customer.find(...)         →    db.customers.find(...)
Attendance.find(...)       →    db.attendances.find(...)
User.find(...)             →    db.users.find(...)
```

### แผนที่ Model → Collection (ดูได้จากไฟล์ models/)

| ชื่อ Model ใน Code | ชื่อ Collection ใน DB | ไฟล์ที่กำหนด |
|-------------------|----------------------|-------------|
| `Material` | **`materials`** | `models/Inventory.js` บรรทัด 18 |
| `StockLog` | **`stocklogs`** | `models/StockLog.js` บรรทัด 20 |
| `Project` | **`projects`** | `models/Project.js` บรรทัด 65 |
| `Quotation` | **`quotations`** | `models/Quotation.js` |
| `Customer` | **`customers`** | `models/Customer.js` |
| `Attendance` | **`attendances`** | `models/Attendance.js` |
| `User` | **`users`** | `models/User.js` |

### วิธีแปลง Mongoose → mongosh อย่างรวดเร็ว

| กฎ | Mongoose (code) | mongosh (shell) |
|----|----------------|-----------------|
| ชื่อนำหน้า | `Material.` | `db.materials.` |
| ค้นหาด้วย ID | `findById('abc123')` | `findOne({ _id: ObjectId('abc123') })` |
| ลบ method ที่ไม่มีใน shell | `.lean()` `.select()` | ลบออกได้เลย หรือใช้ projection แทน |
| aggregate / find / countDocuments | **เหมือนกันทุกอย่าง** ✅ | **เหมือนกันทุกอย่าง** ✅ |

> 💡 **สรุปสั้น:** ดู Query ใน code แล้วอยากรันใน shell → เปลี่ยนแค่ `ModelName.` เป็น `db.collectionname.` แค่นั้นพอ

---

## 📁 โครงสร้างไฟล์ที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|------|--------|
| `routes/inventory.js` | Backend route + MongoDB queries สำหรับ Inventory |
| `routes/projects.js` | Backend route + MongoDB queries สำหรับ Projects |
| `routes/reports.js` | Backend route + MongoDB queries สำหรับ Reports |
| `js/pages/inventory.js` | Frontend controller สำหรับหน้า Inventory |
| `js/pages/projects.js` | Frontend controller สำหรับหน้า Projects |
| `js/pages/reports.js` | Frontend controller สำหรับหน้า Reports |
| `js/api.js` | Layer กลางที่ Frontend ใช้เรียก API |

---

## 🗄️ Collections ใน Database

| Collection | ใช้ใน |
|------------|--------|
| `materials` | Inventory (วัสดุ) |
| `stocklogs` | การเคลื่อนไหวสต๊อก |
| `projects` | โครงการ |
| `quotations` | ใบเสนอราคา |
| `customers` | ลูกค้า |
| `attendances` | การเข้างาน |
| `users` | ผู้ใช้งาน |

---

# 📦 ส่วนที่ 1: หน้า Inventory (`inventory.html`)

ไฟล์ Backend: `routes/inventory.js`
ไฟล์ Frontend: `js/pages/inventory.js`

---

## 1.1 โหลดรายการวัสดุทั้งหมด (ตารางหลัก)

**ฟีเจอร์:** แสดงตารางวัสดุทุกรายการเมื่อเปิดหน้า

**เรียกผ่าน:** `api.inventory.getAll()` → `js/pages/inventory.js` บรรทัด **16**

**Backend endpoint:** `GET /api/inventory`

**Query ที่ทำงาน:** `routes/inventory.js` บรรทัด **69**

```js
// ดึงวัสดุทั้งหมด เรียงตามชื่อ
Material.find(query).sort({ name: 1 })
// query object สร้างจาก filter params (บรรทัด 62-67):
// - ถ้ามี ?type=xxx  → query.type = type
// - ถ้ามี ?search=xxx → query.name = { $regex: search, $options: 'i' }
// - ถ้ามี ?lowStock=true → query.$expr = { $lte: ['$quantity', '$minimumThreshold'] }
```

**Query เสริม (บรรทัด 10-27):** คำนวณ `generalUseQuantity` (ยอดใช้งานทั่วไป ไม่ผูกโครงการ)

```js
// Aggregate stocklogs หาจำนวนที่เบิกออกโดยไม่มี projectId
StockLog.aggregate([
    {
        $match: {
            inventoryId: { $in: inventoryIds },
            type: 'out',
            $or: [
                { projectId: { $exists: false } },
                { projectId: null }
            ]
        }
    },
    {
        $group: {
            _id: '$inventoryId',
            totalQuantity: { $sum: '$quantity' }
        }
    }
])
```

---

## 1.2 ดูรายละเอียดวัสดุรายชิ้น

**ฟีเจอร์:** ใช้ภายในระบบเมื่อต้องการข้อมูลวัสดุชิ้นเดียว (เช่น ตอน Stock In/Out)

**Backend endpoint:** `GET /api/inventory/:id`

**Query ที่ทำงาน:** `routes/inventory.js` บรรทัด **87**

```js
Material.findById(req.params.id)
```

---

## 1.3 ค้นหา / กรองวัสดุ (Search & Filter)

**ฟีเจอร์:** ช่องค้นหา + dropdown กรองประเภท + กรองสต๊อกใกล้หมด

**ทำงานใน Frontend:** `js/pages/inventory.js` บรรทัด **319-343** (ฟังก์ชัน `filterInventory`)

> ⚠️ การค้นหาทำ **client-side** จาก data ที่โหลดมาแล้ว ไม่ได้ยิง query ใหม่ไปที่ DB

```js
// กรองจาก this.items ที่โหลดมาครั้งแรก
const filtered = this.items.filter(item => {
    const matchSearch = materialCode.includes(search)   // รหัสวัสดุ (6 ตัวท้ายของ _id)
        || itemName.includes(search)                    // ชื่อวัสดุ
        || specification.includes(search);              // รายละเอียด/spec
    const matchType = type === 'all' || item.type === type;
    const isLow = item.quantity <= (item.minimumThreshold || 10);
    const matchStock = stock === 'all' || (stock === 'low' && isLow) || (stock === 'normal' && !isLow);
    return matchSearch && matchType && matchStock;
});
```

---

## 1.4 สถิติสรุป Inventory (Summary Cards)

**ฟีเจอร์:** แสดง Card จำนวนรายการทั้งหมด / ใกล้หมด / ปกติ

**ทำงานใน Frontend:** `js/pages/inventory.js` บรรทัด **101-111** (ฟังก์ชัน `updateStats`)

> คำนวณจาก `this.items` ที่โหลดมาแล้ว ไม่ได้ยิง query แยก

**Backend stats endpoint** (ใช้กรณีต้องการข้อมูลละเอียด): `GET /api/inventory/stats/summary`

**Query ที่ทำงาน:** `routes/inventory.js` บรรทัด **218-223**

```js
// นับจำนวนวัสดุทั้งหมด
Material.countDocuments()

// นับวัสดุที่ quantity <= minimumThreshold
Material.countDocuments({ $expr: { $lte: ['$quantity', '$minimumThreshold'] } })

// คำนวณมูลค่าสต๊อกรวม (quantity × unitPrice)
Material.aggregate([
    { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }
])

// ดึงประเภทวัสดุทั้งหมดที่มี (unique)
Material.distinct('type')
```

---

## 1.5 รับวัสดุเข้า (Stock In)

**ฟีเจอร์:** กดปุ่ม 📥 แล้วกรอกจำนวน → เพิ่มสต๊อก + บันทึก log

**เรียกผ่าน:** `api.inventory.stockIn(id, data)` → `js/pages/inventory.js` บรรทัด **264**

**Backend endpoint:** `POST /api/inventory/:id/stock-in`

**Query ที่ทำงาน:** `routes/inventory.js` บรรทัด **134, 141, 145-155**

```js
// 1. ดึงข้อมูลวัสดุที่ต้องการรับเข้า
Material.findById(req.params.id)

// 2. อัพเดท quantity แล้ว save
item.quantity += quantity;
item.lastUpdated = Date.now();
await item.save();   // ใช้ save() แทน findByIdAndUpdate

// 3. บันทึก StockLog
StockLog.create({
    inventoryId: item._id,
    itemName: item.name,
    type: 'in',
    quantity,
    previousStock,
    newStock: item.quantity,
    reason,
    createdBy: userId,
    createdByName: createdByDisplayName
})
```

**Lookup เพิ่มเติม (บรรทัด 52):** ตรวจสอบชื่อ user ผู้ทำรายการ

```js
User.findById(userId).select('firstName lastName name email')
```

---

## 1.6 เบิกวัสดุออก (Stock Out — ทั่วไป ไม่ผูกโครงการ)

**ฟีเจอร์:** กดปุ่ม 📤 แล้วกรอกจำนวน → ลดสต๊อก + บันทึก log

**เรียกผ่าน:** `api.inventory.stockOut(id, data)` → `js/pages/inventory.js` บรรทัด **271**

**Backend endpoint:** `POST /api/inventory/:id/stock-out`

**Query ที่ทำงาน:** `routes/inventory.js` บรรทัด **167, 175, 195**

```js
// 1. ดึงข้อมูลวัสดุ และตรวจสอบสต๊อก
Material.findById(req.params.id)

// 2. อัพเดท quantity แล้ว save
item.quantity -= quantity;
item.lastUpdated = Date.now();
await item.save();

// 3. บันทึก StockLog (ไม่มี projectId เพราะเป็นการเบิกทั่วไป)
StockLog.create({
    inventoryId: item._id,
    itemName: item.name,
    type: 'out',
    quantity,
    previousStock,
    newStock: item.quantity,
    reason,
    createdBy: userId,
    createdByName: createdByDisplayName
    // projectId: ไม่มี → ระบบจะนับเป็น generalUse
})
```

---

## 1.7 ดูประวัติการเคลื่อนไหวสต๊อก (Stock Logs)

**ฟีเจอร์:** ดูย้อนหลัง 50 รายการล่าสุดของวัสดุชิ้นนั้น

**Backend endpoint:** `GET /api/inventory/:id/logs`

**Query ที่ทำงาน:** `routes/inventory.js` บรรทัด **206-208**

```js
StockLog.find({ inventoryId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
```

---

# 🏗️ ส่วนที่ 2: หน้า Projects (`projects.html`)

ไฟล์ Backend: `routes/projects.js`
ไฟล์ Frontend: `js/pages/projects.js`

---

## 2.1 โหลดโครงการทั้งหมด

**ฟีเจอร์:** แสดง grid card โครงการทั้งหมดเมื่อเปิดหน้า

**เรียกผ่าน:** `api.projects.getAll()` → `js/pages/projects.js` บรรทัด **423**

**Backend endpoint:** `GET /api/projects`

**Query ที่ทำงาน:** `routes/projects.js` บรรทัด **343-347**

```js
Project.find(query)
    .populate('customerId', 'name phone address')       // ดึงชื่อ/โทร/ที่อยู่ลูกค้า
    .populate('quotationId', 'quotationNumber totalAmount status')  // ดึงข้อมูลใบเสนอราคา
    .populate('assignedTeam', 'username role')          // ดึงข้อมูลทีม
    .sort({ createdAt: -1 })                            // เรียงล่าสุดก่อน
// query object สร้างจาก filter:
// - ถ้ามี ?status=xxx → query.status = status  (ต้องอยู่ใน STATUS_VALUES)
// - ถ้ามี ?paymentStatus=xxx → query.paymentStatus = paymentStatus
```

**การค้นหาชื่อโครงการ/ลูกค้า:** ทำ client-side บรรทัด **349-355**

```js
// กรองใน JavaScript หลังได้ข้อมูลมาแล้ว
projects.filter(project => {
    const projectName = String(project.name || '').toLowerCase();
    const customerName = String(project.customerId?.name || '').toLowerCase();
    return projectName.includes(keyword) || customerName.includes(keyword);
})
```

---

## 2.2 โหลดรายการลูกค้า (สำหรับ Dropdown)

**ฟีเจอร์:** Dropdown เลือกลูกค้าตอนสร้าง/แก้ไขโครงการ

**เรียกผ่าน:** `api.customers.getAll()` → `js/pages/projects.js` บรรทัด **437**

**Backend endpoint:** `GET /api/customers`

---

## 2.3 โหลดรายการใบเสนอราคา (สำหรับ Dropdown)

**ฟีเจอร์:** Dropdown ผูกใบเสนอราคากับโครงการ + auto-fill ราคาขาย

**เรียกผ่าน:** `api.quotations.getAll()` → `js/pages/projects.js` บรรทัด **451**

**Backend endpoint:** `GET /api/quotations`

---

## 2.4 โหลดรายการวัสดุ (สำหรับเพิ่มในโครงการ)

**ฟีเจอร์:** ค้นหาและเลือกวัสดุสำหรับแนบในโครงการ

**เรียกผ่าน:** `api.inventory.getAll()` → `js/pages/projects.js` บรรทัด **224**

**Backend endpoint:** `GET /api/inventory`

**Query ที่ทำงาน:** `routes/inventory.js` บรรทัด **69** (เหมือนหน้า Inventory)

```js
Material.find({}).sort({ name: 1 })
```

---

## 2.5 ดูรายละเอียดโครงการรายชิ้น (View Project)

**ฟีเจอร์:** กดปุ่ม "ดูวัสดุ" หรือ "แก้ไข" เพื่อโหลดข้อมูลโครงการนั้น

**Backend endpoint:** `GET /api/projects/:id`

**Query ที่ทำงาน:** `routes/projects.js` บรรทัด **404-407**

```js
Project.findById(req.params.id)
    .populate('customerId', 'name phone address email')
    .populate('quotationId', 'quotationNumber totalAmount status')
    .populate('assignedTeam', 'username role')
```

---

## 2.6 ตรวจสอบข้อมูลก่อนสร้างโครงการ

**ฟีเจอร์:** ตรวจสอบว่า customerId ที่ส่งมามีอยู่จริงใน DB

**Query ที่ทำงาน:** `routes/projects.js` บรรทัด **158**

```js
Customer.exists({ _id: customerId })
```

---

## 2.7 ดึงข้อมูลวัสดุก่อนสร้าง/แก้ไขโครงการ (buildProjectMaterials)

**ฟีเจอร์:** ตรวจสอบ + ดึงราคาวัสดุที่แนบกับโครงการ

**Query ที่ทำงาน:** `routes/projects.js` บรรทัด **182-184**

```js
// ดึงวัสดุตาม IDs ที่ส่งมา (ดึงเฉพาะ fields ที่จำเป็น)
Material.find({ _id: { $in: materialIds } })
    .select('name specification unit unitPrice')
    .lean()
```

---

## 2.8 ดึงข้อมูลใบเสนอราคาก่อนสร้างโครงการ

**ฟีเจอร์:** ผูกใบเสนอราคากับโครงการ → คำนวณราคาขาย net price

**Query ที่ทำงาน:** `routes/projects.js` บรรทัด **76-78**

```js
Quotation.findById(quotationId)
    .select('customerId subtotal totalProfit totalNetPrice discount totalAmount items')
    .lean()
```

---

## 2.9 สถิติสรุปโครงการ (Stats Summary Cards)

**ฟีเจอร์:** Card แสดง จำนวนโครงการทั้งหมด / แต่ละสถานะ / ยอดเงิน

**Backend endpoint:** `GET /api/projects/stats/summary`

**Query ที่ทำงาน:** `routes/projects.js` บรรทัด **367-384**

```js
// นับโครงการทุกสถานะ
Project.countDocuments()
Project.countDocuments({ status: 'planning' })
Project.countDocuments({ status: 'in-progress' })
Project.countDocuments({ status: 'completed' })

// คำนวณยอดเงินรวม
Project.aggregate([
    {
        $group: {
            _id: null,
            totalCost:  { $sum: '$totalCost' },
            totalPrice: { $sum: '$totalPrice' }
        }
    }
])

// นับสถานะการชำระเงิน
Project.countDocuments({ paymentStatus: 'unpaid' })
Project.countDocuments({ paymentStatus: 'partial' })
Project.countDocuments({ paymentStatus: 'paid' })
```

---

## 2.10 อัพเดทสถานะโครงการ + Auto Stock Deduct/Restore

**ฟีเจอร์:** เปลี่ยนสถานะโครงการ → ระบบ auto ตัด/คืนสต๊อกอัตโนมัติ

**เรียกผ่าน:** `api.projects.updateStatus(id, data)` → `js/pages/projects.js` (ทำ PATCH /status)

**Backend endpoint:** `PATCH /api/projects/:id/status`

**Flow การทำงาน:**

### ขั้นที่ 1: ดึงโครงการ
`routes/projects.js` บรรทัด **556**
```js
Project.findById(req.params.id)
```

### ขั้นที่ 2: ถ้าเปลี่ยนเป็น `in-progress` → ตัดสต๊อก (`deductStockForProject`)
`routes/projects.js` บรรทัด **222, 246**
```js
// ดึงวัสดุทุกชิ้นที่โครงการใช้ (batch query)
Material.find({ _id: { $in: materialIds } })

// สำหรับแต่ละวัสดุ: ลด quantity แล้ว save + บันทึก StockLog
stockItem.quantity -= qty;
await stockItem.save();

StockLog.create({
    inventoryId: stockItem._id,
    itemName: stockItem.name,
    type: 'out',
    quantity: qty,
    previousStock,
    newStock: stockItem.quantity,
    projectId: project._id,
    projectName: project.name,
    reason: `Auto stock-out: project moved to in-progress (${project.name})`,
    movementSource: 'project-status-deduct',
    movementDetail: { projectStatus: 'in-progress', ... },
    createdBy: resolvedActor.userId,
    createdByName: resolvedActor.createdByName
})
```

### ขั้นที่ 3: ถ้าเปลี่ยนเป็น `cancelled` → คืนสต๊อก (`restoreStockForProject`)
`routes/projects.js` บรรทัด **288, 304**
```js
// ดึงวัสดุ (batch query)
Material.find({ _id: { $in: materialIds } })

// สำหรับแต่ละวัสดุ: เพิ่ม quantity แล้ว save + บันทึก StockLog
stockItem.quantity += qty;
await stockItem.save();

StockLog.create({
    type: 'in',
    reason: `Auto stock-restore: project cancelled (${project.name})`,
    movementSource: 'project-status-restore',
    ...
})
```

### ขั้นที่ 4: บันทึกโครงการ + โหลดใหม่พร้อม populate
`routes/projects.js` บรรทัด **585-590**
```js
await project.save();
Project.findById(project._id)
    .populate('customerId', 'name phone address')
    .populate('quotationId', 'quotationNumber totalAmount status')
    .populate('assignedTeam', 'username role')
```

---

## 2.11 ยกเลิกโครงการ (Cancel Project)

**ฟีเจอร์:** กดปุ่ม "ยกเลิกโครงการ" → เปลี่ยนสถานะ + คืนสต๊อก

**Backend endpoint:** `PATCH /api/projects/:id/cancel`

**Query ที่ทำงาน:** `routes/projects.js` บรรทัด **601, 629-632**

```js
// ดึงโครงการ
Project.findById(req.params.id)

// เซฟ + โหลดใหม่
await project.save();
Project.findById(project._id)
    .populate('customerId', 'name phone address')
    .populate('quotationId', 'quotationNumber totalAmount status')
    .populate('assignedTeam', 'username role')
```

> กรณีมีสต๊อกที่ถูกตัดไปแล้ว → เรียก `restoreStockForProject` (Query เหมือนข้อ 2.10 ขั้น 3)

---

## 2.12 ค้นหา User สำหรับบันทึกชื่อผู้ทำรายการ

**ฟีเจอร์:** ระบบบันทึกว่าใครเป็นคนเปลี่ยนสถานะ/ตัดสต๊อก

**Query ที่ทำงาน:** `routes/projects.js` บรรทัด **47**

```js
User.findById(actorId).select('firstName lastName name email')
```

---

# 📊 ส่วนที่ 3: หน้า Reports (`reports.html`)

ไฟล์ Backend: `routes/reports.js`
ไฟล์ Frontend: `js/pages/reports.js`

---

## 3.1 โหลดข้อมูล Dashboard หลัก

**ฟีเจอร์:** โหลดครั้งเดียวเมื่อเปิดหน้า → เก็บใน `ReportsPage.allProjects` ใช้ทุกแท็บ

**เรียกผ่าน:** `api.reports.getDashboard()` → `js/pages/reports.js` บรรทัด **49**

**Backend endpoint:** `GET /api/reports/dashboard`

**Query ที่ทำงาน:** `routes/reports.js` บรรทัด **14-44**

```js
// 1. ดึงโครงการที่ "เสร็จสิ้น + ชำระแล้ว" → ใช้คำนวณ Revenue/Profit cards
Project.find({
    status: 'completed',
    paymentStatus: 'paid'
}).lean()

// 2. ดึงโครงการทั้งหมด → ใช้แสดงตารางและนับสถานะ
Project.find()
    .populate('customerId', 'name phone')
    .sort({ createdAt: -1 })
    .lean()

// 3. นับวัสดุที่สต๊อกต่ำกว่า minimumThreshold
Inventory.countDocuments({ $expr: { $lte: ['$quantity', '$minimumThreshold'] } })

// 4. นับจำนวนลูกค้าทั้งหมด
Customer.countDocuments()
```

**การคำนวณที่ Frontend (js/pages/reports.js):**

| ฟังก์ชัน | บรรทัด | การทำงาน |
|---------|---------|----------|
| `updateCardsByMonth()` | 119-172 | กรองโครงการ completed+paid ในเดือนที่เลือก → คำนวณ Revenue/Profit/Margin |
| `renderRevenueChart()` | 176-323 | สร้างกราฟ 6 เดือน จาก allProjects ที่โหลดมาแล้ว |
| `renderRevenueTable()` | 327-406 | แสดงตารางโครงการ completed+paid ในเดือนที่เลือก |

---

## 3.2 แท็บ "รายได้" — Revenue Report

**ฟีเจอร์:** กราฟ + ตารางโครงการที่เสร็จแล้วชำระแล้ว กรองตามเดือน

**ไม่ยิง Query ใหม่** — ใช้ข้อมูล `allProjects` ที่โหลดจาก Dashboard (ข้อ 3.1)

**Logic Filter:** `js/pages/reports.js` บรรทัด **332-335**

```js
// กรอง client-side จาก allProjects
this.allProjects.filter(p => {
    if (p.status !== 'completed' || p.paymentStatus !== 'paid') return false;
    const d = new Date(p.endDate || p.createdAt);   // ใช้ endDate หรือ createdAt
    return d.getFullYear() === this.viewYear && d.getMonth() === this.viewMonth;
})
```

---

## 3.3 แท็บ "โครงการ" — Projects Summary Report

**ฟีเจอร์:** ตารางสรุปจำนวนโครงการแต่ละสถานะ + มูลค่ารวม

**ไม่ยิง Query ใหม่** — ใช้ `allProjects` ที่โหลดมาแล้ว

**Logic:** `js/pages/reports.js` บรรทัด **414-421**

```js
// Group โครงการตาม status ใน JavaScript
this.allProjects.forEach(p => {
    const status = p.status || 'planning';
    statusGroups[status].count++;
    statusGroups[status].totalPrice  += Number(p.totalPrice || 0);
    statusGroups[status].totalProfit += Number(p.totalPrice || 0) - Number(p.totalCost || 0);
});
```

---

## 3.4 แท็บ "วัสดุ" — Inventory Low Stock Report

**ฟีเจอร์:** ตารางวัสดุที่ใกล้หมด (quantity < minimumThreshold)

**เรียกผ่าน:** `api.reports.getInventory()` → `js/pages/reports.js` บรรทัด **468**

**Backend endpoint:** `GET /api/reports/inventory`

**Query ที่ทำงาน:** `routes/reports.js` บรรทัด **104-116**

```js
// 1. ดึงเฉพาะวัสดุที่สต๊อก ต่ำกว่า threshold (strictly less than)
Inventory.find({
    $expr: { $lt: ['$quantity', '$minimumThreshold'] }  // $lt = น้อยกว่า (ไม่รวมเท่ากัน)
}).sort({ quantity: 1, name: 1 })  // เรียงจากน้อยที่สุดก่อน

// 2. Aggregate สถิติตามประเภทวัสดุ (categoryStats)
Inventory.aggregate([
    {
        $group: {
            _id: '$type',
            count:         { $sum: 1 },
            totalValue:    { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
            totalQuantity: { $sum: '$quantity' }
        }
    }
])
```

**Filter เพิ่มที่ Frontend:** `js/pages/reports.js` บรรทัด **470-474**

```js
// กรองซ้ำอีกรอบ client-side (double check)
const items = rawItems.filter(item => {
    const qty = Number(item.quantity || 0);
    const min = Number(item.minimumThreshold || 0);
    return qty < min;   // strictly less than
});
```

---

## 3.5 แท็บ "การมาสาย" — Attendance Report

**ฟีเจอร์:** ตารางพนักงานที่มาสายในเดือนนั้น

**เรียกผ่าน:** `api.reports.getAttendance()` → `js/pages/reports.js` บรรทัด **531**

**Backend endpoint:** `GET /api/reports/attendance`

**Query ที่ทำงาน:** `routes/reports.js` บรรทัด **171-186**

```js
// 1. ดึงบันทึกการเข้างานทั้งเดือน (กรองด้วย date range)
Attendance.find({
    date: { $gte: startDate, $lte: endDate }    // startDate = วันที่ 1 ของเดือน, endDate = วันสุดท้าย
}).populate('userId', 'name email')
  .sort({ date: -1 })

// 2. Aggregate สถิติรายคน
Attendance.aggregate([
    { $match: { date: { $gte: startDate, $lte: endDate } } },
    {
        $group: {
            _id: '$userId',
            userName:     { $first: '$userName' },
            totalDays:    { $sum: 1 },
            lateDays:     { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
            avgWorkHours: { $avg: '$workHours' }
        }
    }
])
```

**Filter เพิ่มที่ Frontend:** `js/pages/reports.js` บรรทัด **535**

```js
// แสดงเฉพาะคนที่ status === 'late'
const lateRecords = records.filter(r => r.status === 'late');
```

---

## 3.6 Sales Report (endpoint พร้อมใช้แต่ยังไม่แสดง UI)

**Backend endpoint:** `GET /api/reports/sales`

**Query ที่ทำงาน:** `routes/reports.js` บรรทัด **77-92**

```js
// ดึง Quotations ที่ approved (กรองด้วย date range ถ้ามี)
Quotation.find({
    ...dateFilter,   // { createdAt: { $gte: startDate, $lte: endDate } }
    status: 'approved'
}).sort({ createdAt: -1 })

// Aggregate ยอดขายรายเดือน
Quotation.aggregate([
    { $match: { ...dateFilter, status: 'approved' } },
    {
        $group: {
            _id:   { $month: '$createdAt' },   // group ตามเดือน
            count: { $sum: 1 },
            total: { $sum: '$totalAmount' }
        }
    },
    { $sort: { _id: 1 } }
])
```

---

## 3.7 Stock Movements Report (endpoint พร้อมใช้แต่ยังไม่แสดง UI)

**Backend endpoint:** `GET /api/reports/stock-movements`

**Query ที่ทำงาน:** `routes/reports.js` บรรทัด **209-222**

```js
// ดึง StockLog ทั้งหมด (กรองด้วย date range และ type ถ้ามี)
StockLog.find(query)
    .populate('inventoryId', 'name category')
    .populate('projectId', 'projectName')
    .sort({ createdAt: -1 })

// Aggregate สรุปตาม type (in/out)
StockLog.aggregate([
    { $match: query },
    {
        $group: {
            _id:           '$type',
            count:         { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
        }
    }
])
```

---

## 3.8 Projects Annual Report (endpoint พร้อมใช้แต่ยังไม่แสดง UI)

**Backend endpoint:** `GET /api/reports/projects?year=YYYY`

**Query ที่ทำงาน:** `routes/reports.js` บรรทัด **134-153**

```js
// ดึงโครงการที่สร้างในปีนั้น
Project.find({
    createdAt: { $gte: startOfYear, $lte: endOfYear }
})

// Aggregate ตามเดือน
Project.aggregate([
    { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },
    {
        $group: {
            _id:         { $month: '$createdAt' },
            count:       { $sum: 1 },
            totalBudget: { $sum: '$budget' }
        }
    },
    { $sort: { _id: 1 } }
])

// Aggregate ตาม status
Project.aggregate([
    { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
])
```

---

# 🔑 สรุปภาพรวม MongoDB Operations ทั้งหมด

| หน้า | Operation | Collection | ไฟล์ | บรรทัด |
|------|-----------|------------|------|--------|
| Inventory | `find().sort()` | materials | routes/inventory.js | 69 |
| Inventory | `findById()` | materials | routes/inventory.js | 87 |
| Inventory | `aggregate()` generalUse | stocklogs | routes/inventory.js | 10-27 |
| Inventory | `countDocuments()` | materials | routes/inventory.js | 218-219 |
| Inventory | `aggregate()` totalValue | materials | routes/inventory.js | 220-222 |
| Inventory | `distinct()` | materials | routes/inventory.js | 223 |
| Inventory | `findById()` + `save()` stock-in | materials | routes/inventory.js | 134, 141 |
| Inventory | `create()` stock-in log | stocklogs | routes/inventory.js | 145 |
| Inventory | `findById()` + `save()` stock-out | materials | routes/inventory.js | 167, 175 |
| Inventory | `create()` stock-out log | stocklogs | routes/inventory.js | 195 |
| Inventory | `find().sort().limit()` logs | stocklogs | routes/inventory.js | 206-208 |
| Projects | `find().populate().sort()` | projects | routes/projects.js | 343-347 |
| Projects | `findById().populate()` | projects | routes/projects.js | 404-407 |
| Projects | `exists()` validate customer | customers | routes/projects.js | 158 |
| Projects | `find().select().lean()` materials | materials | routes/projects.js | 182-184 |
| Projects | `findById().select().lean()` quotation | quotations | routes/projects.js | 76-78 |
| Projects | `countDocuments()` x5 | projects | routes/projects.js | 367-384 |
| Projects | `aggregate()` financials | projects | routes/projects.js | 372-380 |
| Projects | `find()` deduct stock | materials | routes/projects.js | 222 |
| Projects | `save()` + `create()` deduct | materials, stocklogs | routes/projects.js | 244, 246 |
| Projects | `find()` restore stock | materials | routes/projects.js | 288 |
| Projects | `save()` + `create()` restore | materials, stocklogs | routes/projects.js | 302, 304 |
| Projects | `findById()` cancel | projects | routes/projects.js | 601 |
| Projects | `findByIdAndDelete()` | projects | routes/projects.js | 652 |
| Projects | `findById().select()` actor | users | routes/projects.js | 47 |
| Reports | `find()` completed+paid | projects | routes/reports.js | 14-17 |
| Reports | `find().populate().sort()` all | projects | routes/reports.js | 26-29 |
| Reports | `countDocuments()` low stock | materials | routes/reports.js | 43 |
| Reports | `countDocuments()` customers | customers | routes/reports.js | 44 |
| Reports | `find()` low stock items | materials | routes/reports.js | 104-106 |
| Reports | `aggregate()` category stats | materials | routes/reports.js | 108-117 |
| Reports | `find().populate().sort()` attendance | attendances | routes/reports.js | 171-173 |
| Reports | `aggregate()` user stats | attendances | routes/reports.js | 175-186 |
| Reports | `find()` quotations sales | quotations | routes/reports.js | 77-80 |
| Reports | `aggregate()` monthly sales | quotations | routes/reports.js | 82-92 |
| Reports | `find().populate()` stock-movements | stocklogs | routes/reports.js | 209-212 |
| Reports | `aggregate()` stock summary | stocklogs | routes/reports.js | 214-223 |

---

*อัพเดทล่าสุด: 28 มีนาคม 2569 | ระบบ SK Aluminium*
