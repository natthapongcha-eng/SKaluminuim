const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Quotation = require('../models/Quotation');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const Attendance = require('../models/Attendance');
const StockLog = require('../models/StockLog');

// Dashboard summary
router.get('/dashboard', async (req, res) => {
    try {
        // Projects completed AND paid → used for revenue/profit cards
        const completedPaidProjects = await Project.find({
            status: 'completed',
            paymentStatus: 'paid'
        }).lean();

        const totalRevenue = completedPaidProjects.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
        const totalCost = completedPaidProjects.reduce((sum, p) => sum + Number(p.totalCost || 0), 0);
        const totalProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const completedProjectsCount = completedPaidProjects.length;

        // All projects for the breakdown table
        const allProjects = await Project.find()
            .populate('customerId', 'name phone')
            .sort({ createdAt: -1 })
            .lean();

        // Status counts
        const statusCounts = {
            planning: 0,
            'in-progress': 0,
            completed: 0,
            cancelled: 0
        };
        allProjects.forEach(p => {
            if (statusCounts[p.status] !== undefined) statusCounts[p.status]++;
        });

        // Low stock
        const lowStockItems = await Inventory.countDocuments({ $expr: { $lte: ['$quantity', '$minimumThreshold'] } });
        const totalCustomers = await Customer.countDocuments();

        res.json({
            totalRevenue,
            totalCost,
            totalProfit,
            profitMargin,
            completedProjects: completedProjectsCount,
            statusCounts,
            lowStockItems,
            totalCustomers,
            projects: allProjects
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Sales report
router.get('/sales', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = {};
        
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }
        
        const quotations = await Quotation.find({
            ...dateFilter,
            status: 'approved'
        }).sort({ createdAt: -1 });
        
        const summary = await Quotation.aggregate([
            { $match: { ...dateFilter, status: 'approved' } },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 },
                    total: { $sum: '$totalAmount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({ quotations, summary });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Inventory report - low stock items only
router.get('/inventory', async (req, res) => {
    try {
        // Only get low-stock items: quantity < minimumThreshold (strictly less than)
        const lowStockItems = await Inventory.find({
            $expr: { $lt: ['$quantity', '$minimumThreshold'] }
        }).sort({ quantity: 1, name: 1 });
        
        const categoryStats = await Inventory.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
                    totalQuantity: { $sum: '$quantity' }
                }
            }
        ]);
        
        res.json({ items: lowStockItems, categoryStats, lowStockCount: lowStockItems.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Project report
router.get('/projects', async (req, res) => {
    try {
        const { year } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        
        const startOfYear = new Date(y, 0, 1);
        const endOfYear = new Date(y, 11, 31, 23, 59, 59);
        
        const projects = await Project.find({
            createdAt: { $gte: startOfYear, $lte: endOfYear }
        });
        
        const monthlyStats = await Project.aggregate([
            { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 },
                    totalBudget: { $sum: '$budget' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        const statusStats = await Project.aggregate([
            { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        res.json({ projects, monthlyStats, statusStats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Attendance report
router.get('/attendance', async (req, res) => {
    try {
        const { month, year } = req.query;
        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();
        
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59);
        
        const records = await Attendance.find({
            date: { $gte: startDate, $lte: endDate }
        }).populate('userId', 'name email').sort({ date: -1 });
        
        const userStats = await Attendance.aggregate([
            { $match: { date: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: '$userId',
                    userName: { $first: '$userName' },
                    totalDays: { $sum: 1 },
                    lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
                    avgWorkHours: { $avg: '$workHours' }
                }
            }
        ]);
        
        res.json({ records, userStats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Stock movement report
router.get('/stock-movements', async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;
        let query = {};
        
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        if (type) query.type = type;
        
        const logs = await StockLog.find(query)
            .populate('inventoryId', 'name category')
            .populate('projectId', 'projectName')
            .sort({ createdAt: -1 });
        
        const summary = await StockLog.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' }
                }
            }
        ]);
        
        res.json({ logs, summary });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
