const express = require('express');
const router = express.Router();
const Material = require('../models/Inventory');
const StockLog = require('../models/StockLog');
const User = require('../models/User');
//   require(....) รับ Model ที่ส่งออกมา → ใช้งานได้เลย

//ฟังก์ชัน ยอดใช้งานทั่วไป ไม่ผูกโครงการ

/*รับ inventoryIds = ['id1', 'id2', 'id3']
         ↓
ยิง aggregate ไป stocklogs
  → กรองเฉพาะ type='out' และ ไม่มี projectId
  → group ตาม inventoryId แล้วรวม quantity
         ↓
ได้ array ผลลัพธ์
         ↓
.reduce() แปลงเป็น object { id: ยอดรวม }
         ↓
ส่งกลับให้ caller นำไปแปะใน itemsWithGeneralUse
(ใช้ใน routes/inventory.js บรรทัด 74)
*/
async function getGeneralUseTotalsByInventoryIds(inventoryIds = []) {
    if (!Array.isArray(inventoryIds) || inventoryIds.length === 0) return {};

    const totals = await StockLog.aggregate([
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
    ]);

    return totals.reduce((acc, row) => {
        acc[String(row._id)] = row.totalQuantity || 0;
        return acc;
    }, {});
}

function normalizeDisplayName(name = '') {
    return String(name || '').trim();
}

function buildUserDisplayName(user) {
    if (!user) return '';
    const firstName = normalizeDisplayName(user.firstName);
    const lastName = normalizeDisplayName(user.lastName);
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || normalizeDisplayName(user.name) || normalizeDisplayName(user.email);
}

async function resolveCreatedByName(userId, fallbackName = '') {
    const normalizedFallback = normalizeDisplayName(fallbackName);
    if (!userId) return normalizedFallback;

    try {
        const user = await User.findById(userId).select('firstName lastName name email');
        return buildUserDisplayName(user) || normalizedFallback;
    } catch (error) {
        return normalizedFallback;
    }
}

// Get all inventory items (from materials collection)
// GET /api/inventory รับเข้ามาจาก frontend
router.get('/', async (req, res) => {
    try {
        const { type, search, lowStock } = req.query;
        let query = {};

        if (type) query.type = type;
        if (search) query.name = { $regex: search, $options: 'i' };
        if (lowStock === 'true') query.$expr = { $lte: ['$quantity', '$minimumThreshold'] };

        const items = await Material.find(query).sort({ name: 1 });
        // script ยิง query ดึงวัสดุทั้งหมดมาแสดงเรียงตามชื่อ
        const generalUseTotals = await getGeneralUseTotalsByInventoryIds(items.map(item => item._id));

        const itemsWithGeneralUse = items.map(item => {
            const plain = item.toObject();
            plain.generalUseQuantity = generalUseTotals[String(item._id)] || 0;
            return plain;
        });

        res.json(itemsWithGeneralUse);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single inventory item
// GET /api/inventory/:id
//ค้นหาวัสดุด้วย id
router.get('/:id', async (req, res) => {
    try {
        const item = await Material.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create inventory item
router.post('/', async (req, res) => {
    try {
        const item = new Material(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update inventory item
router.put('/:id', async (req, res) => {
    try {
        const item = await Material.findByIdAndUpdate(
            req.params.id,
            { ...req.body, lastUpdated: Date.now() },
            { new: true }
        );
        res.json(item);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
    try {
        await Material.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Stock In
router.post('/:id/stock-in', async (req, res) => {
    try {
        const { quantity, reason, userId, createdByName } = req.body;
        const item = await Material.findById(req.params.id);

        if (!item) return res.status(404).json({ message: 'Item not found' });

        const previousStock = item.quantity;
        item.quantity += quantity;
        item.lastUpdated = Date.now();
        await item.save();

        // Log the transaction
        const createdByDisplayName = await resolveCreatedByName(userId, createdByName);
        await StockLog.create({
            inventoryId: item._id,
            itemName: item.name,
            type: 'in',
            quantity,
            previousStock,
            newStock: item.quantity,
            reason,
            createdBy: userId,
            createdByName: createdByDisplayName
        });

        res.json(item);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Stock Out
router.post('/:id/stock-out', async (req, res) => {
    try {
        const { quantity, reason, projectId, userId, createdByName } = req.body;
        const item = await Material.findById(req.params.id);

        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (item.quantity < quantity) return res.status(400).json({ message: 'Insufficient stock' });

        const previousStock = item.quantity;
        item.quantity -= quantity;
        item.lastUpdated = Date.now();
        await item.save();

        // Log the transaction
        const normalizedProjectId = typeof projectId === 'string' ? projectId.trim() : projectId;
        const createdByDisplayName = await resolveCreatedByName(userId, createdByName);
        const logPayload = {
            inventoryId: item._id,
            itemName: item.name,
            type: 'out',
            quantity,
            previousStock,
            newStock: item.quantity,
            reason,
            createdBy: userId,
            createdByName: createdByDisplayName
        };
        if (normalizedProjectId) {
            logPayload.projectId = normalizedProjectId;
        }

        await StockLog.create(logPayload);

        res.json(item);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get stock logs
router.get('/:id/logs', async (req, res) => {
    try {
        const logs = await StockLog.find({ inventoryId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get inventory stats
router.get('/stats/summary', async (req, res) => {
    try {
        const totalItems = await Material.countDocuments();
        const lowStockItems = await Material.countDocuments({ $expr: { $lte: ['$quantity', '$minimumThreshold'] } }); // เงื่อนไขเก็บรายวัสดุเฉพาะที่มีจำนวนน้อยกว่าหรือเท่ากับจำนวนที่กำหนด
        const totalValue = await Material.aggregate([
            { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }
        ]);
        const types = await Material.distinct('type');

        res.json({
            totalItems,
            lowStockItems,
            totalValue: totalValue[0]?.total || 0,
            typesCount: types.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

