# Data Dictionary: Aluminium Management System

**Created Date:** March 29, 2026 | **Modified Date:** March 29, 2026  
**Database:** MongoDB | **Application:** SK Aluminium

---

## Table 1: users

**Description:** Stores user account details and authentication information  
**Collection Name:** `users`  
**Primary Key:** `_id`  
**Foreign Key:** -  

| No | Column Name | Data Type | Size | Nullable | Description | Example |
|---|---|---|---|---|---|---|
| 1 | _id | ObjectId | - | No | Unique user identifier (PK) | 507f1f77bcf86cd799439011 |
| 2 | email | String | - | No | Unique email address for login | john@example.com |
| 3 | password | String | - | No | Hashed password | $2b$10$... |
| 4 | firstName | String | - | Yes | Employee first name | John |
| 5 | lastName | String | - | Yes | Employee last name | Smith |
| 6 | phone | String | - | Yes | Contact phone number | 0812345678 |
| 7 | name | String | - | Yes | Full name display | John Smith |
| 8 | profileImage | String | - | Yes | Profile image URL or Base64 | data:image/jpeg;base64,... |
| 9 | role | String | - | No | User role (CEO, ADMIN, EMPLOYEE) | ADMIN |
| 10 | createdAt | Date | - | No | Account creation timestamp | 2026-01-15T10:30:00Z |

**Relationships:**
- One-to-Many: Users → Quotation (createdBy)
- One-to-Many: Users → Attendance (userId)
- One-to-Many: Users → StockLog (createdBy)
- One-to-Many: Users → Media (uploadedBy)

---

## Table 2: customers

**Description:** Stores customer/client information  
**Collection Name:** `customers`  
**Primary Key:** `_id`  
**Foreign Key:** -

| No | Column Name | Data Type | Size | Nullable | Description | Example |
|---|---|---|---|---|---|---|
| 1 | _id | ObjectId | - | No | Unique customer identifier (PK) | 507f191e810c19729de860ea |
| 2 | customerType | String | - | No | Type: individual or company | company |
| 3 | name | String | - | No | Customer full name or contact person | นายสมชาย |
| 4 | companyName | String | - | Yes | Company name (if company) | ABC Aluminum Co., Ltd. |
| 5 | phone | String | - | No | Primary contact phone | 0234567890 |
| 6 | email | String | - | Yes | Contact email address | contact@abc.com |
| 7 | address | String | - | Yes | Full address | 123 ถนนสุขุมวิท กรุงเทพ |
| 8 | notes | String | - | Yes | Additional notes/comments | ลูกค้าปกติ |
| 9 | totalProjects | Number | - | No | Count of projects with this customer | 5 |
| 10 | totalSpent | Number | - | No | Total spending amount (THB) | 250000 |
| 11 | createdAt | Date | - | No | Record creation timestamp | 2025-06-20T14:22:00Z |

**Relationships:**
- One-to-Many: Customers → Project (customerId)
- One-to-Many: Customers → Quotation (customerId)

---

## Table 3: projects

**Description:** Stores project/job information with materials and status  
**Collection Name:** `projects`  
**Primary Key:** `_id`  
**Foreign Key:** `customerId`, `quotationId`, `assignedTeam[]`

| No | Column Name | Data Type | Size | Nullable | Description | Example |
|---|---|---|---|---|---|---|
| 1 | _id | ObjectId | - | No | Unique project identifier (PK) | 69c581797173be5fe5dc9987 |
| 2 | name | String | - | No | Project name/title | โครงการตัดอลูมิเนียม |
| 3 | customerId | ObjectId | - | No | Reference to Customer (FK) | 507f191e810c19729de860ea |
| 4 | quotationId | ObjectId | - | Yes | Reference to Quotation (FK) | 69b029bdd478773994cbeb04 |
| 5 | totalCost | Number | - | No | Total material cost (THB) | 45000 |
| 6 | totalPrice | Number | - | No | Total selling price (THB) | 65000 |
| 7 | quotedNetPrice | Number | - | No | Quoted net price (THB) | 65000 |
| 8 | paymentStatus | String | - | No | unpaid / partial / paid | partial |
| 9 | status | String | - | No | planning / in-progress / completed / cancelled | in-progress |
| 10 | team | String | - | Yes | Team name or description | ทีมก่อสร้าง A |
| 11 | startDate | Date | - | Yes | Project start date | 2026-01-10T08:00:00Z |
| 12 | endDate | Date | - | Yes | Project end/completion date | 2026-02-10T17:00:00Z |
| 13 | assignedTeam | Array[ObjectId] | - | Yes | Array of User IDs assigned to project | [507f1f77bcf86cd799439011] |
| 14 | description | String | - | Yes | Project description/notes | ตัดและยัดให้เป็นรูป |
| 15 | materials | Array | - | Yes | Embedded materials list with qty, price | [{materialId, name, qty, unitPrice}] |
| 16 | stockDeducted | Boolean | - | No | Flag: stock deducted from inventory | true |
| 17 | stockDeductedAt | Date | - | Yes | Timestamp when stock was deducted | 2026-01-10T09:00:00Z |
| 18 | stockRestored | Boolean | - | No | Flag: stock restored to inventory | false |
| 19 | stockRestoredAt | Date | - | Yes | Timestamp when stock was restored | - |
| 20 | createdAt | Date | - | No | Record creation timestamp | 2026-01-09T15:30:00Z |

**Materials Sub-document:**
- materialId (ObjectId) → Reference to Inventory
- name (String) → Material name
- specification (String) → Size/specifications
- unit (String) → Unit of measure
- qty (Number) → Quantity used
- unitPrice (Number) → Price per unit
- total (Number) → Total (qty × unitPrice)

**Relationships:**
- Many-to-One: Project → Customer (customerId)
- Many-to-One: Project → Quotation (quotationId)
- Many-to-Many: Project → User (assignedTeam)
- One-to-Many: Project → Media (projectId)
- One-to-Many: Project → StockLog (projectId)

---

## Table 4: quotations

**Description:** Stores quotation/proposal details for customers  
**Collection Name:** `quotations`  
**Primary Key:** `_id`  
**Foreign Key:** `customerId`, `createdBy`

| No | Column Name | Data Type | Size | Nullable | Description | Example |
|---|---|---|---|---|---|---|
| 1 | _id | ObjectId | - | No | Unique quotation identifier (PK) | 69b029bdd478773994cbeb04 |
| 2 | quotationNumber | String | - | No | Unique quotation reference number | QT-2026-0001 |
| 3 | customerId | ObjectId | - | Yes | Reference to Customer (FK) | 507f191e810c19729de860ea |
| 4 | customerName | String | - | No | Customer name (denormalized) | ABC Aluminum Co., Ltd. |
| 5 | customerAddress | String | - | Yes | Customer address (denormalized) | 123 ถนนสุขุมวิท |
| 6 | customerPhone | String | - | Yes | Customer phone (denormalized) | 0234567890 |
| 7 | items | Array | - | No | Array of quotation line items | [{name, quantity, unit, pricePerUnit}] |
| 8 | subtotal | Number | - | No | Subtotal before discount (THB) | 65000 |
| 9 | totalProfit | Number | - | No | Total profit (THB) | 20000 |
| 10 | totalNetPrice | Number | - | No | Net price (THB) | 65000 |
| 11 | discount | Number | - | Yes | Discount amount (THB) | 0 |
| 12 | totalAmount | Number | - | No | Total amount (subtotal - discount) | 65000 |
| 13 | status | String | - | No | draft / sent / approved / rejected | approved |
| 14 | notes | String | - | Yes | Quotation notes/terms | ดำเนินการตามเงื่อนไข |
| 15 | validUntil | Date | - | Yes | Quotation validity date | 2026-02-01T23:59:59Z |
| 16 | createdBy | ObjectId | - | Yes | Reference to User who created (FK) | 507f1f77bcf86cd799439011 |
| 17 | createdAt | Date | - | No | Record creation timestamp | 2026-01-08T10:15:00Z |

**Items Sub-document:**
- name (String) → Item description
- quantity (Number) → Quantity
- unit (String) → Unit of measure
- pricePerUnit (Number) → Price per unit (THB)
- total (Number) → Total (qty × pricePerUnit)
- profitPerUnit (Number) → Profit per unit

**Relationships:**
- One-to-Many: Quotation → Project (via quotationId)
- Many-to-One: Quotation → Customer (customerId)
- Many-to-One: Quotation → User (createdBy)
- One-to-Many: Quotation → Media (quotationId)

---

## Table 5: materials

**Description:** Stores inventory items/materials stock information  
**Collection Name:** `materials`  
**Primary Key:** `_id`  
**Foreign Key:** -

| No | Column Name | Data Type | Size | Nullable | Description | Example |
|---|---|---|---|---|---|---|
| 1 | _id | ObjectId | - | No | Unique material identifier (PK) | 507f1f77bcf86cd799439011 |
| 2 | name | String | - | No | Material name | อลูมิเนียมแท้ |
| 3 | type | String | - | No | NEW or SCRAP | NEW |
| 4 | quantity | Number | - | No | Current stock quantity | 150 |
| 5 | specification | String | - | Yes | Size/specifications details | 30x30x2 mm |
| 6 | unit | String | - | Yes | Unit of measure (e.g., ชิ้น, เมตร) | ชิ้น |
| 7 | minimumThreshold | Number | - | Yes | Minimum stock threshold for alerts | 20 |
| 8 | unitPrice | Number | - | Yes | Price per unit (THB) | 150 |
| 9 | location | String | - | Yes | Storage location | โรงทำการ A - ชั้น 2 |
| 10 | lastUpdated | Date | - | No | Last update timestamp | 2026-03-28T16:45:00Z |

**Relationships:**
- One-to-Many: Material → StockLog (inventoryId)
- One-to-Many: Material → Project (via materials array)

---

## Table 6: stocklogs

**Description:** Tracks all inventory movements (in/out) for auditing  
**Collection Name:** `stocklogs`  
**Primary Key:** `_id`  
**Foreign Key:** `inventoryId`, `projectId`, `createdBy`

| No | Column Name | Data Type | Size | Nullable | Description | Example |
|---|---|---|---|---|---|---|
| 1 | _id | ObjectId | - | No | Unique log entry identifier (PK) | 507f1f77bcf86cd799439012 |
| 2 | inventoryId | ObjectId | - | No | Reference to Inventory (FK) | 507f1f77bcf86cd799439011 |
| 3 | itemName | String | - | No | Material name (denormalized) | อลูมิเนียมแท้ |
| 4 | type | String | - | No | Transaction type: in or out | out |
| 5 | quantity | Number | - | No | Quantity moved | 25 |
| 6 | previousStock | Number | - | No | Stock level before transaction | 150 |
| 7 | newStock | Number | - | No | Stock level after transaction | 125 |
| 8 | projectId | ObjectId | - | Yes | Reference to Project (FK) | 69c581797173be5fe5dc9987 |
| 9 | projectName | String | - | Yes | Project name (denormalized) | โครงการตัดอลูมิเนียม |
| 10 | reason | String | - | Yes | Reason for movement | ใช้ในโครงการ |
| 11 | movementSource | String | - | Yes | Source system/module | projects |
| 12 | movementDetail | Mixed | - | Yes | Additional movement details | {materialId, projectId} |
| 13 | createdBy | ObjectId | - | Yes | Reference to User (FK) | 507f1f77bcf86cd799439011 |
| 14 | createdByName | String | - | Yes | User name (denormalized) | John Smith |
| 15 | createdAt | Date | - | No | Transaction timestamp | 2026-01-10T09:30:00Z |

**Relationships:**
- Many-to-One: StockLog → Inventory (inventoryId)
- Many-to-One: StockLog → Project (projectId)
- Many-to-One: StockLog → User (createdBy)

---

## Table 7: medias

**Description:** Stores project and quotation attachments (images, PDFs)  
**Collection Name:** `medias`  
**Primary Key:** `_id`  
**Foreign Key:** `projectId` OR `quotationId`, `uploadedBy`

| No | Column Name | Data Type | Size | Nullable | Description | Example |
|---|---|---|---|---|---|---|
| 1 | _id | ObjectId | - | No | Unique media identifier (PK) | 69c59e24f72fb042ae72323a |
| 2 | filename | String | - | No | Stored filename | 1704857400000_project.jpg |
| 3 | originalName | String | - | No | Original filename uploaded | project_photo.jpg |
| 4 | mimetype | String | - | No | File MIME type (image/jpeg, etc) | image/jpeg |
| 5 | size | Number | - | No | File size in bytes | 2560000 |
| 6 | mediaType | String | - | No | project or quotation | project |
| 7 | path | String | - | Yes | Filesystem path (if stored on disk) | /uploads/media/by-project/69c581797173be5fe5dc9987/before/ |
| 8 | imageData | Buffer | 10MB | Yes | File binary data (if stored in DB) | <binary data> |
| 9 | storageType | String | - | No | database or filesystem | filesystem |
| 10 | stage | String | - | Yes | before / during / after (projects only) | before |
| 11 | projectId | ObjectId | - | Yes | Reference to Project (FK) | 69c581797173be5fe5dc9987 |
| 12 | quotationId | ObjectId | - | Yes | Reference to Quotation (FK) | - |
| 13 | description | String | - | Yes | File description | ภาพแสดงสถานการณ์ก่อนเริ่ม |
| 14 | uploadedBy | ObjectId | - | Yes | Reference to User (FK) | 507f1f77bcf86cd799439011 |
| 15 | createdAt | Date | - | No | Upload timestamp | 2026-01-10T08:30:00Z |

**Relationships:**
- Many-to-One: Media → Project (projectId)
- Many-to-One: Media → Quotation (quotationId)
- Many-to-One: Media → User (uploadedBy)

---

## Table 8: attendances

**Description:** Employee attendance records and work hours tracking  
**Collection Name:** `attendances`  
**Primary Key:** `_id` + Unique Index: `userId + date`  
**Foreign Key:** `userId`, `updatedBy`, `adjustedBy`

| No | Column Name | Data Type | Size | Nullable | Description | Example |
|---|---|---|---|---|---|---|
| 1 | _id | ObjectId | - | No | Unique attendance record (PK) | 507f1f77bcf86cd799439013 |
| 2 | userId | ObjectId | - | No | Reference to User (FK) | 507f1f77bcf86cd799439011 |
| 3 | userName | String | - | No | User name (denormalized) | John Smith |
| 4 | date | Date | - | No | Attendance date (compound PK with userId) | 2026-03-28T00:00:00Z |
| 5 | checkIn | Date | - | Yes | Check-in timestamp | 2026-03-28T08:30:15Z |
| 6 | checkOut | Date | - | Yes | Check-out timestamp | 2026-03-28T17:15:30Z |
| 7 | workHours | Number | - | Yes | Calculated work hours | 8.75 |
| 8 | status | String | - | No | present / late / absent / leave / no_checkout | present |
| 9 | note | String | - | Yes | Attendance notes/remarks | ปกติ |
| 10 | updatedBy | String | - | Yes | User who updated record | system |
| 11 | adjustedBy | String | - | Yes | User who made adjustments | ADMIN |
| 12 | adjustedAt | Date | - | Yes | Adjustment timestamp | 2026-03-28T18:00:00Z |
| 13 | adjustedReason | String | - | Yes | Reason for adjustment | ปรับเนื่องจากประชุม |
| 14 | createdAt | Date | - | No | Record creation timestamp | 2026-03-28T08:35:00Z |

**Relationships:**
- Many-to-One: Attendance → User (userId)

---

## Table 9: announcements

**Description:** System-wide announcements/notifications for staff  
**Collection Name:** `announcements`  
**Primary Key:** `_id`  
**Foreign Key:** -

| No | Column Name | Data Type | Size | Nullable | Description | Example |
|---|---|---|---|---|---|---|
| 1 | _id | ObjectId | - | No | Unique announcement identifier (PK) | 507f1f77bcf86cd799439014 |
| 2 | content | String | 2000 | No | Announcement message content | ปิดสำนักงานวันที่ 1 เมษายน |
| 3 | createdBy | String | - | Yes | Creator name/role | CEO |
| 4 | createdAt | Date | - | No | Creation timestamp | 2026-03-27T10:00:00Z |
| 5 | updatedAt | Date | - | No | Last update timestamp | 2026-03-27T10:00:00Z |
| 6 | startAt | Date | - | No | Announcement display start time | 2026-03-28T00:00:00Z |
| 7 | endAt | Date | - | No | Announcement display end time | 2026-04-04T23:59:59Z |
| 8 | isActive | Boolean | - | No | Display status flag | true |

**Constraints:**
- Maximum duration: 7 days (endAt - startAt <= 7 days)
- Status is determined by: isActive=true AND (now between startAt and endAt)

**Relationships:** None

---

## Summary Statistics

| Table Name | Record Count | Primary Purpose |
|---|---|---|
| Users | ~10 | Authentication & authorization |
| Customers | ~50+ | Client/prospect management |
| Projects | ~35+ | Job tracking & costing |
| Quotations | ~100+ | Sales proposals |
| Materials | ~50+ | Inventory tracking |
| StockLogs | ~200+ | Audit trail for inventory |
| Media | ~30+ | Project/quotation attachments |
| Attendance | ~500+ | Employee attendance records |
| Announcements | ~20+ | Staff notifications |

---

## Notes

- All timestamps use ISO 8601 UTC format
- Currency values are in Thai Baht (THB)
- Soft delete: Announcements use `isActive` flag instead of document deletion
- Stock management: StockLogs maintain complete history of all movements
- Media: Can store either in MongoDB (imageData) or filesystem (path)
- Compound indexes used for performance on frequently queried fields

---

**Document Version:** 1.0  
**Last Updated:** March 29, 2026
