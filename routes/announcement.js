const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');

// Get the current active announcement
router.get('/', async (req, res) => {
    try {
        const announcement = await Announcement.findOne({ isActive: true })
            .sort({ updatedAt: -1 });
        
        res.json({ 
            announcement: announcement ? announcement.content : '',
            _id: announcement ? announcement._id : null,
            createdAt: announcement ? announcement.createdAt : null,
            updatedAt: announcement ? announcement.updatedAt : null
        });
    } catch (error) {
        console.error('Error getting announcement:', error);
        res.status(500).json({ message: 'Error retrieving announcement' });
    }
});

// Create or update the announcement
router.post('/', async (req, res) => {
    try {
        const { content, createdBy = 'CEO' } = req.body;
        
        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }

        // Deactivate previous announcements
        await Announcement.updateMany({ isActive: true }, { isActive: false });

        // Create new announcement
        const announcement = new Announcement({
            content,
            createdBy,
            isActive: true
        });

        await announcement.save();
        
        res.json({ 
            message: 'Announcement updated successfully',
            announcement: announcement.content,
            _id: announcement._id
        });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ message: 'Error updating announcement' });
    }
});

// Delete the current active announcement
router.delete('/', async (req, res) => {
    try {
        const result = await Announcement.updateMany(
            { isActive: true }, 
            { isActive: false }
        );

        res.json({ 
            message: 'Announcement deleted successfully',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ message: 'Error deleting announcement' });
    }
});

// Get announcement history
router.get('/history', async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .sort({ createdAt: -1 })
            .limit(10);
        
        res.json(announcements);
    } catch (error) {
        console.error('Error getting announcement history:', error);
        res.status(500).json({ message: 'Error retrieving history' });
    }
});

module.exports = router;