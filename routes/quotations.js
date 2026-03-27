const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');

function isObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(String(id || ''));
}

// Get all quotations
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = {};
        
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { quotationNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } }
            ];
        }
        
        const quotations = await Quotation.find(query)
            .sort({ createdAt: -1 })
            .populate('customerId', 'name phone');
        res.json(quotations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single quotation
router.get('/:id', async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid quotation id' });
        }

        const quotation = await Quotation.findById(req.params.id)
            .populate('customerId')
            .populate('createdBy', 'name');
        if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
        res.json(quotation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Generate next quotation number
router.get('/next/number', async (req, res) => {
    try {
        const quotations = await Quotation.find(
            { quotationNumber: { $regex: '^QT-\\d+$' } },
            { quotationNumber: 1, _id: 0 }
        ).lean();

        let maxNumber = 0;
        for (const q of quotations) {
            const numericPart = parseInt(String(q.quotationNumber).replace('QT-', ''), 10);
            if (Number.isFinite(numericPart) && numericPart > maxNumber) {
                maxNumber = numericPart;
            }
        }

        const nextNumber = maxNumber + 1;
        const quotationNumber = `QT-${String(nextNumber).padStart(3, '0')}`;
        res.json({ quotationNumber });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create quotation
router.post('/', async (req, res) => {
    try {
        // Calculate totals
        const items = req.body.items || [];
        const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
        const discount = req.body.discount || 0;
        const vat = (subtotal - discount) * 0.07;
        const totalAmount = subtotal - discount + vat;
        
        const quotation = new Quotation({
            ...req.body,
            subtotal,
            vat,
            totalAmount
        });
        
        await quotation.save();
        res.status(201).json(quotation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update quotation
router.put('/:id', async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid quotation id' });
        }

        // Recalculate totals if items changed
        if (req.body.items) {
            const items = req.body.items;
            req.body.subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
            req.body.vat = (req.body.subtotal - (req.body.discount || 0)) * 0.07;
            req.body.totalAmount = req.body.subtotal - (req.body.discount || 0) + req.body.vat;
        }
        
        const quotation = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(quotation);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete quotation
router.delete('/:id', async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid quotation id' });
        }

        await Quotation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Quotation deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get quotation stats
router.get('/stats/summary', async (req, res) => {
    try {
        const total = await Quotation.countDocuments();
        const draft = await Quotation.countDocuments({ status: 'draft' });
        const sent = await Quotation.countDocuments({ status: 'sent' });
        const approved = await Quotation.countDocuments({ status: 'approved' });
        const totalValue = await Quotation.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        res.json({
            total,
            draft,
            sent,
            approved,
            totalValue: totalValue[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
