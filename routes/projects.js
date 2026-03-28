const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const Material = require('../models/Inventory');
const StockLog = require('../models/StockLog');
const Quotation = require('../models/Quotation');
const User = require('../models/User');

const STATUS_VALUES = new Set(['planning', 'in-progress', 'completed', 'cancelled']);
const PAYMENT_VALUES = new Set(['unpaid', 'partial', 'paid']);
const LOCKED_CANCEL_STATUS = { status: 'completed', paymentStatus: 'paid' };

function normalizeStatus(status) {
    return STATUS_VALUES.has(status) ? status : 'planning';
}

function normalizePaymentStatus(paymentStatus) {
    return PAYMENT_VALUES.has(paymentStatus) ? paymentStatus : 'unpaid';
}

function isCompletedAndPaid(projectLike) {
    return projectLike?.status === LOCKED_CANCEL_STATUS.status
        && projectLike?.paymentStatus === LOCKED_CANCEL_STATUS.paymentStatus;
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

async function resolveActor(userId, fallbackName = '') {
    const actorId = userId || null;
    const fallback = normalizeDisplayName(fallbackName);
    if (!actorId) {
        return { userId: null, createdByName: fallback };
    }

    try {
        const user = await User.findById(actorId).select('firstName lastName name email');
        return {
            userId: actorId,
            createdByName: buildUserDisplayName(user) || fallback
        };
    } catch (error) {
        return {
            userId: actorId,
            createdByName: fallback
        };
    }
}

function parseTotalPrice(value) {
    const totalPrice = Number(value || 0);
    return Number.isFinite(totalPrice) && totalPrice >= 0 ? totalPrice : 0;
}

function parseTotalCost(value) {
    const totalCost = Number(value || 0);
    return Number.isFinite(totalCost) && totalCost >= 0 ? totalCost : 0;
}

async function resolveQuotationPricing({ customerId, quotationId, fallbackTotalPrice }) {
    if (!quotationId) {
        const parsed = parseTotalPrice(fallbackTotalPrice);
        return { quotationId: null, quotedNetPrice: parsed, totalPrice: parsed };
    }

    const quotation = await Quotation.findById(quotationId)
        .select('customerId subtotal totalProfit totalNetPrice discount totalAmount items')
        .lean();

    if (!quotation) {
        throw new Error('Quotation not found');
    }

    if (customerId && quotation.customerId && String(quotation.customerId) !== String(customerId)) {
        throw new Error('Selected quotation does not belong to this customer');
    }

    const explicitNetPrice = Number(quotation.totalNetPrice);
    if (Number.isFinite(explicitNetPrice)) {
        const parsed = parseTotalPrice(explicitNetPrice);
        return {
            quotationId: quotation._id,
            quotedNetPrice: parsed,
            totalPrice: parsed
        };
    }

    const totalAmount = Number(quotation.totalAmount);
    if (Number.isFinite(totalAmount)) {
        const parsed = parseTotalPrice(totalAmount);
        return {
            quotationId: quotation._id,
            quotedNetPrice: parsed,
            totalPrice: parsed
        };
    }

    const items = Array.isArray(quotation.items) ? quotation.items : [];
    if (items.length > 0) {
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
        const discount = Number(quotation.discount || 0);
        const parsed = parseTotalPrice(subtotal + totalProfit - (Number.isFinite(discount) ? discount : 0));
        return {
            quotationId: quotation._id,
            quotedNetPrice: parsed,
            totalPrice: parsed
        };
    }

    const subtotal = Number(quotation.subtotal);
    const totalProfit = Number(quotation.totalProfit || 0);
    const discount = Number(quotation.discount || 0);
    const quotedNetPrice = Number.isFinite(subtotal)
        ? parseTotalPrice(subtotal + (Number.isFinite(totalProfit) ? totalProfit : 0) - (Number.isFinite(discount) ? discount : 0))
        : parseTotalPrice(fallbackTotalPrice);

    return {
        quotationId: quotation._id,
        quotedNetPrice,
        totalPrice: quotedNetPrice
    };
}

function parseOptionalDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function sumMaterialCost(materials = []) {
    return materials.reduce((sum, item) => sum + Number(item.total || 0), 0);
}

async function validateCustomer(customerId) {
    if (!customerId) {
        throw new Error('customerId is required');
    }

    const customerExists = await Customer.exists({ _id: customerId });
    if (!customerExists) {
        throw new Error('Customer not found');
    }
}

async function buildProjectMaterials(inputMaterials = []) {
    if (!Array.isArray(inputMaterials) || inputMaterials.length === 0) {
        return [];
    }

    const requestedItems = inputMaterials
        .map(item => {
            const materialId = item?.materialId || item?.id;
            const qty = Number(item?.qty || item?.quantity || 0);
            return { materialId, qty };
        })
        .filter(item => item.materialId && Number.isFinite(item.qty) && item.qty > 0);

    if (requestedItems.length === 0) {
        return [];
    }

    const materialIds = [...new Set(requestedItems.map(item => String(item.materialId)))];
    const materials = await Material.find({ _id: { $in: materialIds } })
        .select('name specification unit unitPrice')
        .lean();

    const materialMap = new Map(materials.map(item => [String(item._id), item]));

    const missingIds = materialIds.filter(id => !materialMap.has(id));
    if (missingIds.length > 0) {
        throw new Error('Some selected materials were not found in inventory');
    }

    return requestedItems.map(item => {
        const material = materialMap.get(String(item.materialId));
        const unitPrice = Number(material.unitPrice || 0);
        const total = unitPrice * item.qty;

        return {
            materialId: material._id,
            name: material.name,
            specification: material.specification || '',
            unit: material.unit || '',
            qty: item.qty,
            unitPrice,
            total
        };
    });
}

async function deductStockForProject(project, actor = {}) {
    const resolvedActor = await resolveActor(actor.userId, actor.createdByName);
    const materials = Array.isArray(project.materials) ? project.materials : [];
    if (materials.length === 0) {
        project.stockDeducted = true;
        project.stockRestored = false;
        project.stockDeductedAt = new Date();
        project.stockRestoredAt = null;
        return;
    }

    const materialIds = materials.map(item => item.materialId);
    const inventoryItems = await Material.find({ _id: { $in: materialIds } });
    const inventoryMap = new Map(inventoryItems.map(item => [String(item._id), item]));

    for (const used of materials) {
        const stockItem = inventoryMap.get(String(used.materialId));
        const qty = Number(used.qty || 0);

        if (!stockItem) {
            throw new Error(`Material not found in inventory: ${used.name || used.materialId}`);
        }
        if (stockItem.quantity < qty) {
            throw new Error(`Insufficient stock for ${stockItem.name}`);
        }
    }

    for (const used of materials) {
        const stockItem = inventoryMap.get(String(used.materialId));
        const qty = Number(used.qty || 0);
        const previousStock = stockItem.quantity;

        stockItem.quantity -= qty;
        stockItem.lastUpdated = Date.now();
        await stockItem.save();

        await StockLog.create({
            inventoryId: stockItem._id,
            itemName: stockItem.name,
            type: 'out',
            quantity: qty,
            previousStock,
            newStock: stockItem.quantity,
            projectId: project._id,
            projectName: project.name || '',
            reason: `Auto stock-out: project moved to in-progress (${project.name || project._id})`,
            createdBy: resolvedActor.userId,
            createdByName: resolvedActor.createdByName
        });
    }

    project.stockDeducted = true;
    project.stockRestored = false;
    project.stockDeductedAt = new Date();
    project.stockRestoredAt = null;
}

async function restoreStockForProject(project, actor = {}) {
    const resolvedActor = await resolveActor(actor.userId, actor.createdByName);
    const materials = Array.isArray(project.materials) ? project.materials : [];
    if (materials.length === 0) {
        project.stockRestored = true;
        project.stockRestoredAt = new Date();
        return;
    }

    const materialIds = materials.map(item => item.materialId);
    const inventoryItems = await Material.find({ _id: { $in: materialIds } });
    const inventoryMap = new Map(inventoryItems.map(item => [String(item._id), item]));

    for (const used of materials) {
        const stockItem = inventoryMap.get(String(used.materialId));
        const qty = Number(used.qty || 0);

        if (!stockItem) {
            throw new Error(`Material not found in inventory: ${used.name || used.materialId}`);
        }

        const previousStock = stockItem.quantity;
        stockItem.quantity += qty;
        stockItem.lastUpdated = Date.now();
        await stockItem.save();

        await StockLog.create({
            inventoryId: stockItem._id,
            itemName: stockItem.name,
            type: 'in',
            quantity: qty,
            previousStock,
            newStock: stockItem.quantity,
            projectId: project._id,
            projectName: project.name || '',
            reason: `Auto stock-restore: project cancelled (${project.name || project._id})`,
            createdBy: resolvedActor.userId,
            createdByName: resolvedActor.createdByName
        });
    }

    project.stockRestored = true;
    project.stockRestoredAt = new Date();
}

// Get all projects
router.get('/', async (req, res) => {
    try {
        const { status, paymentStatus, search } = req.query;
        const query = {};

        if (STATUS_VALUES.has(status)) query.status = status;
        if (PAYMENT_VALUES.has(paymentStatus)) query.paymentStatus = paymentStatus;

        let projects = await Project.find(query)
            .populate('customerId', 'name phone address')
            .populate('quotationId', 'quotationNumber totalAmount status')
            .sort({ createdAt: -1 });

        if (search) {
            const keyword = search.toLowerCase();
            projects = projects.filter(project => {
                const projectName = String(project.name || '').toLowerCase();
                const customerName = String(project.customerId?.name || '').toLowerCase();
                return projectName.includes(keyword) || customerName.includes(keyword);
            });
        }

        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get summary stats
router.get('/stats/summary', async (req, res) => {
    try {
        const total = await Project.countDocuments();
        const planning = await Project.countDocuments({ status: 'planning' });
        const inProgress = await Project.countDocuments({ status: 'in-progress' });
        const completed = await Project.countDocuments({ status: 'completed' });

        const financials = await Project.aggregate([
            {
                $group: {
                    _id: null,
                    totalCost: { $sum: '$totalCost' },
                    totalPrice: { $sum: '$totalPrice' }
                }
            }
        ]);

        const unpaidCount = await Project.countDocuments({ paymentStatus: 'unpaid' });
        const partialCount = await Project.countDocuments({ paymentStatus: 'partial' });
        const paidCount = await Project.countDocuments({ paymentStatus: 'paid' });

        res.json({
            total,
            planning,
            inProgress,
            completed,
            totalCost: financials[0]?.totalCost || 0,
            totalPrice: financials[0]?.totalPrice || 0,
            profit: (financials[0]?.totalPrice || 0) - (financials[0]?.totalCost || 0),
            paymentStats: { unpaid: unpaidCount, partial: partialCount, paid: paidCount }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single project
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('customerId', 'name phone address email')
            .populate('quotationId', 'quotationNumber totalAmount status');

        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create project (does not deduct stock)
router.post('/', async (req, res) => {
    try {
        await validateCustomer(req.body.customerId);
        const name = String(req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ message: 'Project name is required' });
        }

        const materials = await buildProjectMaterials(req.body.materials);
        const materialCost = sumMaterialCost(materials);
        const hasManualCost = req.body.totalCost !== undefined && req.body.totalCost !== null && req.body.totalCost !== '';
        const totalCost = hasManualCost ? parseTotalCost(req.body.totalCost) : materialCost;
        const pricing = await resolveQuotationPricing({
            customerId: req.body.customerId,
            quotationId: req.body.quotationId,
            fallbackTotalPrice: req.body.totalPrice
        });

        const project = await Project.create({
            name,
            customerId: req.body.customerId,
            quotationId: pricing.quotationId,
            totalCost,
            totalPrice: pricing.totalPrice,
            quotedNetPrice: pricing.quotedNetPrice,
            paymentStatus: 'unpaid',
            status: 'planning',
            team: String(req.body.team || ''),
            startDate: parseOptionalDate(req.body.startDate),
            endDate: parseOptionalDate(req.body.endDate),
            description: req.body.description,
            materials,
            stockDeducted: false,
            stockRestored: false
        });

        const populated = await Project.findById(project._id)
            .populate('customerId', 'name phone address')
            .populate('quotationId', 'quotationNumber totalAmount status');

        res.status(201).json(populated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update full project data
router.put('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'ไม่พบโครงการ' });

        if (req.body.customerId) {
            await validateCustomer(req.body.customerId);
            project.customerId = req.body.customerId;
        }

        if (typeof req.body.name === 'string') {
            const name = req.body.name.trim();
            if (!name) return res.status(400).json({ message: 'กรุณาระบุชื่อโครงการ' });
            project.name = name;
        }

        const nextStatus = req.body.status !== undefined
            ? normalizeStatus(req.body.status)
            : project.status;
        const nextPayment = req.body.paymentStatus !== undefined
            ? normalizePaymentStatus(req.body.paymentStatus)
            : project.paymentStatus;

        if (isCompletedAndPaid(project) && nextStatus === 'cancelled') {
            return res.status(400).json({ message: 'โครงการเสร็จสิ้นและชำระเงินแล้ว ไม่สามารถยกเลิกได้' });
        }

        if (req.body.materials !== undefined) {
            const isLockedByStatus = ['in-progress', 'completed'].includes(project.status) || ['in-progress', 'completed'].includes(nextStatus);
            if (isLockedByStatus || (project.stockDeducted && !project.stockRestored)) {
                return res.status(400).json({ message: 'ไม่สามารถเพิ่ม/ลบวัสดุได้ เมื่อโครงการอยู่ระหว่างดำเนินการหรือเสร็จสิ้น' });
            }
            project.materials = await buildProjectMaterials(req.body.materials);
            project.totalCost = sumMaterialCost(project.materials);
        }

        if (req.body.totalCost !== undefined) {
            project.totalCost = parseTotalCost(req.body.totalCost);
        }

        if (req.body.totalPrice !== undefined || req.body.quotationId !== undefined) {
            const pricing = await resolveQuotationPricing({
                customerId: project.customerId,
                quotationId: req.body.quotationId,
                fallbackTotalPrice: req.body.totalPrice
            });
            project.quotationId = pricing.quotationId;
            project.quotedNetPrice = pricing.quotedNetPrice;
            project.totalPrice = pricing.totalPrice;
        }
        if (req.body.team !== undefined) project.team = String(req.body.team || '');
        if (req.body.startDate !== undefined) project.startDate = parseOptionalDate(req.body.startDate);
        if (req.body.endDate !== undefined) project.endDate = parseOptionalDate(req.body.endDate);
        if (req.body.description !== undefined) project.description = req.body.description;

        const shouldDeduct = nextStatus === 'in-progress' && (!project.stockDeducted || project.stockRestored);
        const shouldRestore = nextStatus === 'cancelled' && project.stockDeducted && !project.stockRestored;

        if (shouldDeduct) {
            await deductStockForProject(project, {
                userId: req.body?.userId,
                createdByName: req.body?.createdByName
            });
        }
        if (shouldRestore) {
            await restoreStockForProject(project, {
                userId: req.body?.userId,
                createdByName: req.body?.createdByName
            });
        }

        project.status = nextStatus;
        project.paymentStatus = nextPayment;

        await project.save();

        const updated = await Project.findById(project._id)
            .populate('customerId', 'name phone address')
            .populate('quotationId', 'quotationNumber totalAmount status');

        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update status only (with stock behavior)
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, paymentStatus, userId, createdByName } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'ไม่พบโครงการ' });

        const nextStatus = normalizeStatus(status ?? project.status);
        const nextPayment = normalizePaymentStatus(paymentStatus ?? project.paymentStatus);

        if (isCompletedAndPaid(project) && nextStatus === 'cancelled') {
            return res.status(400).json({ message: 'โครงการเสร็จสิ้นและชำระเงินแล้ว ไม่สามารถยกเลิกได้' });
        }

        const shouldDeduct = nextStatus === 'in-progress' && (!project.stockDeducted || project.stockRestored);
        const shouldRestore = nextStatus === 'cancelled' && project.stockDeducted && !project.stockRestored;

        if (shouldDeduct) {
            await deductStockForProject(project, { userId, createdByName });
        }

        if (shouldRestore) {
            await restoreStockForProject(project, { userId, createdByName });
        }

        const noChange = nextStatus === project.status && nextPayment === project.paymentStatus;
        if (noChange && !shouldDeduct && !shouldRestore) {
            return res.json(project);
        }

        project.status = nextStatus;
        project.paymentStatus = nextPayment;

        await project.save();

        const updated = await Project.findById(project._id)
            .populate('customerId', 'name phone address')
            .populate('quotationId', 'quotationNumber totalAmount status');

        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Cancel project + auto restore stock
router.patch('/:id/cancel', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'ไม่พบโครงการ' });

        if (isCompletedAndPaid(project)) {
            return res.status(400).json({ message: 'โครงการเสร็จสิ้นและชำระเงินแล้ว ไม่สามารถยกเลิกได้' });
        }

        if (project.status === 'cancelled') {
            if (project.stockDeducted && !project.stockRestored) {
                await restoreStockForProject(project, {
                    userId: req.body?.userId,
                    createdByName: req.body?.createdByName
                });
                await project.save();
            }
            return res.json(project);
        }

        if (project.stockDeducted && !project.stockRestored) {
            await restoreStockForProject(project, {
                userId: req.body?.userId,
                createdByName: req.body?.createdByName
            });
        }

        project.status = 'cancelled';
        await project.save();

        const updated = await Project.findById(project._id)
            .populate('customerId', 'name phone address')
            .populate('quotationId', 'quotationNumber totalAmount status');

        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete project (allowed only if no outstanding stock deduction)
router.delete('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'ไม่พบโครงการ' });

        if (project.stockDeducted && !project.stockRestored) {
            return res.status(400).json({
                message: 'โครงการนี้มีการตัดสต๊อกแล้ว กรุณายกเลิกโครงการเพื่อคืนสต๊อกก่อนลบ'
            });
        }

        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: 'Project deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
