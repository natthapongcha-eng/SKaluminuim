const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Customer = require('../models/Customer');

// Get all projects
router.get('/', async (req, res) => {
    try {
        const { status, paymentStatus, search } = req.query;
        let query = {};
        
        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        
        let projects = await Project.find(query)
            .populate('customerId', 'name companyName phone address email')
            .populate('assignedTeam', 'username role')
            .sort({ createdAt: -1 });
        
        // Filter by customer name if search is provided
        if (search) {
            const searchLower = search.toLowerCase();
            projects = projects.filter(p => {
                const customerName = p.customerId?.name || p.customerId?.companyName || '';
                return customerName.toLowerCase().includes(searchLower);
            });
        }
        
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single project
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('customerId', 'name companyName phone address email')
            .populate('assignedTeam', 'username role');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create project
router.post('/', async (req, res) => {
    try {
        const project = new Project(req.body);
        await project.save();
        // Populate customerId before returning
        await project.populate('customerId', 'name companyName phone address email');
        await project.populate('assignedTeam', 'username role');
        res.status(201).json(project);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update project
router.put('/:id', async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('customerId', 'name companyName phone address email')
            .populate('assignedTeam', 'username role');
        res.json(project);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete project
router.delete('/:id', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: 'Project deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get project stats
router.get('/stats/summary', async (req, res) => {
    try {
        const total = await Project.countDocuments();
        const pending = await Project.countDocuments({ status: 'รอดำเนินการ' });
        const inProgress = await Project.countDocuments({ status: 'กำลังดำเนินการ' });
        const completed = await Project.countDocuments({ status: 'เสร็จสิ้น' });
        
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
            pending,
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

module.exports = router;