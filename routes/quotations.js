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
        // Backward compatibility for old clients that still send "customer".
        if (!req.body.customerId && req.body.customer) {
            req.body.customerId = req.body.customer;
        }

        // Calculate totals
        const items = req.body.items || [];
        const subtotal = items.reduce((sum, item) => {
            const qty = Number(item?.quantity || 0);
            const lineTotal = Number(item?.total);
            if (Number.isFinite(lineTotal)) return sum + lineTotal;
            return sum + (qty * Number(item?.pricePerUnit || 0));
        }, 0);
        const totalProfit = items.reduce((sum, item) => {
            const qty = Number(item?.quantity || 0);
            return sum + (qty * Number(item?.profitPerUnit || 0));
        }, 0);
        const discount = Number(req.body.discount || 0);
        const totalNetPrice = subtotal + totalProfit - discount;
        const totalAmount = totalNetPrice;

        // Force VAT to be ignored even if old clients still send it.
        delete req.body.vat;
        
        const quotation = new Quotation({
            ...req.body,
            subtotal,
            totalProfit,
            totalNetPrice,
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

        // Backward compatibility for old clients that still send "customer".
        if (!req.body.customerId && req.body.customer) {
            req.body.customerId = req.body.customer;
        }

        // Recalculate totals if items or discount changed
        if (req.body.items || req.body.discount !== undefined) {
            const items = req.body.items || [];
            req.body.subtotal = items.reduce((sum, item) => {
                const qty = Number(item?.quantity || 0);
                const lineTotal = Number(item?.total);
                if (Number.isFinite(lineTotal)) return sum + lineTotal;
                return sum + (qty * Number(item?.pricePerUnit || 0));
            }, 0);
            req.body.totalProfit = items.reduce((sum, item) => {
                const qty = Number(item?.quantity || 0);
                return sum + (qty * Number(item?.profitPerUnit || 0));
            }, 0);
            req.body.discount = Number(req.body.discount || 0);
            req.body.totalNetPrice = req.body.subtotal + req.body.totalProfit - req.body.discount;
            req.body.totalAmount = req.body.totalNetPrice;
        }

        delete req.body.vat;
        
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
