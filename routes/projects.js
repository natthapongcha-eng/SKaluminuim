const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Customer = require('../models/Customer');
const Material = require('../models/Inventory');

const STATUS_VALUES = new Set(['planning', 'in-progress', 'completed', 'cancelled']);
const PAYMENT_VALUES = new Set(['unpaid', 'partial', 'paid']);

function normalizeStatus(status) {
    return STATUS_VALUES.has(status) ? status : 'planning';
}

function normalizePaymentStatus(paymentStatus) {
    return PAYMENT_VALUES.has(paymentStatus) ? paymentStatus : 'unpaid';
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

function sumMaterialCost(materials = []) {
    return materials.reduce((sum, item) => sum + Number(item.total || 0), 0);
}

function parseTotalPrice(value) {
    const totalPrice = Number(value || 0);
    return Number.isFinite(totalPrice) && totalPrice >= 0 ? totalPrice : 0;
}

function parseOptionalDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
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

router.get('/', async (req, res) => {
    try {
        const { status, paymentStatus, search } = req.query;
        const query = {};

        if (STATUS_VALUES.has(status)) query.status = status;
        if (PAYMENT_VALUES.has(paymentStatus)) query.paymentStatus = paymentStatus;

        let projects = await Project.find(query)
            .populate('customerId', 'name phone address')
            .populate('assignedTeam', 'username role')
            .sort({ createdAt: -1 });

        if (search) {
            const searchLower = search.toLowerCase();
            projects = projects.filter(project => {
                const projectName = String(project.name || '').toLowerCase();
                const customerName = String(project.customerId?.name || '').toLowerCase();
                return projectName.includes(searchLower) || customerName.includes(searchLower);
            });
        }

        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

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

router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('customerId', 'name phone address email')
            .populate('assignedTeam', 'username role');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        await validateCustomer(req.body.customerId);

        const materials = await buildProjectMaterials(req.body.materials);
        const totalCost = sumMaterialCost(materials);

        const project = await Project.create({
            name: String(req.body.name || '').trim(),
            customerId: req.body.customerId,
            totalCost,
            totalPrice: parseTotalPrice(req.body.totalPrice),
            paymentStatus: normalizePaymentStatus(req.body.paymentStatus),
            status: normalizeStatus(req.body.status),
            team: String(req.body.team || ''),
            startDate: parseOptionalDate(req.body.startDate),
            endDate: parseOptionalDate(req.body.endDate),
            description: req.body.description,
            materials
        });

        const populatedProject = await Project.findById(project._id)
            .populate('customerId', 'name phone address')
            .populate('assignedTeam', 'username role');

        res.status(201).json(populatedProject);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (req.body.customerId) {
            await validateCustomer(req.body.customerId);
            project.customerId = req.body.customerId;
        }

        if (typeof req.body.name === 'string') {
            const name = req.body.name.trim();
            if (!name) {
                return res.status(400).json({ message: 'Project name is required' });
            }
            project.name = name;
        }

        if (req.body.materials !== undefined) {
            project.materials = await buildProjectMaterials(req.body.materials);
            project.totalCost = sumMaterialCost(project.materials);
        }

        if (req.body.totalPrice !== undefined) {
            project.totalPrice = parseTotalPrice(req.body.totalPrice);
        }

        if (req.body.paymentStatus !== undefined) {
            project.paymentStatus = normalizePaymentStatus(req.body.paymentStatus);
        }

        if (req.body.status !== undefined) {
            project.status = normalizeStatus(req.body.status);
        }

        if (req.body.team !== undefined) {
            project.team = String(req.body.team || '');
        }

        if (req.body.startDate !== undefined) {
            project.startDate = parseOptionalDate(req.body.startDate);
        }

        if (req.body.endDate !== undefined) {
            project.endDate = parseOptionalDate(req.body.endDate);
        }

        if (req.body.description !== undefined) {
            project.description = req.body.description;
        }

        await project.save();

        const updatedProject = await Project.findById(project._id)
            .populate('customerId', 'name phone address')
            .populate('assignedTeam', 'username role');

        res.json(updatedProject);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: 'Project deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
