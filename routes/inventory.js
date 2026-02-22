const express = require('express');
const router = express.Router();
const Material = require('../models/Inventory');
const StockLog = require('../models/StockLog');

// Get all inventory items (from materials collection)
router.get('/', async (req, res) => {
    try {
        const { type, search, lowStock } = req.query;
        let query = {};
        
        if (type) query.type = type;
        if (search) query.name = { $regex: search, $options: 'i' };
        if (lowStock === 'true') query.$expr = { $lte: ['$quantity', '$minimumThreshold'] };
        
        const items = await Material.find(query).sort({ name: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single inventory item
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
        const { quantity, reason, userId } = req.body; // ส่งมาแค่ quantity กับ reason แต่ userId จะเป็น undefined เพราะไม่ได้ส่งมา แต่ไม่เกิด error ใด ๆ
        /*
        ถ้า property ไหน ไม่มีใน object → ค่านั้นจะเป็น undefined โดยอัตโนมัติ
        กรณีนี้ req.body มีแค่ { quantity, reason } 
       */ 
        const item = await Material.findById(req.params.id);
        
        if (!item) return res.status(404).json({ message: 'Item not found' });
        
        const previousStock = item.quantity;
        item.quantity += quantity;
        item.lastUpdated = Date.now();
        await item.save();
        
        // Log the transaction
        await StockLog.create({
            inventoryId: item._id,
            itemName: item.name,
            type: 'in',
            quantity,
            previousStock,
            newStock: item.quantity,
            reason,
            createdBy: userId
        });
        
        res.json(item);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Stock Out
router.post('/:id/stock-out', async (req, res) => {
    try {
        const { quantity, reason, projectId, userId } = req.body;
        const item = await Material.findById(req.params.id);
        
        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (item.quantity < quantity) return res.status(400).json({ message: 'Insufficient stock' });
        
        const previousStock = item.quantity;
        item.quantity -= quantity;
        item.lastUpdated = Date.now();
        await item.save();
        
        // Log the transaction
        await StockLog.create({
            inventoryId: item._id,
            itemName: item.name,
            type: 'out',
            quantity,
            previousStock,
            newStock: item.quantity,
            projectId,
            reason,
            createdBy: userId
        });
        
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
        const lowStockItems = await Material.countDocuments({ $expr: { $lte: ['$quantity', '$minimumThreshold'] } });
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
