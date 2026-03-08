const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');

const MAX_ANNOUNCEMENT_DAYS = 7;
const MAX_ANNOUNCEMENT_MS = MAX_ANNOUNCEMENT_DAYS * 24 * 60 * 60 * 1000;

function parseAnnouncementWindow(startAtInput, endAtInput) {
    const now = new Date();
    const startAt = startAtInput ? new Date(startAtInput) : now;
    const endAt = endAtInput ? new Date(endAtInput) : new Date(startAt.getTime() + 24 * 60 * 60 * 1000);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        return { error: 'Invalid start/end date format' };
    }

    if (endAt <= startAt) {
        return { error: 'End date must be after start date' };
    }

    if (endAt.getTime() - startAt.getTime() > MAX_ANNOUNCEMENT_MS) {
        return { error: `Announcement duration cannot exceed ${MAX_ANNOUNCEMENT_DAYS} days` };
    }

    return { startAt, endAt };
}

// Get all current active announcements
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        const announcements = await Announcement.find({
            isActive: true,
            startAt: { $lte: now },
            endAt: { $gte: now }
        }).sort({ startAt: 1, updatedAt: -1 });

        const first = announcements[0] || null;
        
        res.json({ 
            announcement: first ? first.content : '',
            _id: first ? first._id : null,
            createdAt: first ? first.createdAt : null,
            updatedAt: first ? first.updatedAt : null,
            announcements: announcements.map(item => ({
                _id: item._id,
                content: item.content,
                createdBy: item.createdBy,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                startAt: item.startAt,
                endAt: item.endAt,
                isActive: item.isActive
            }))
        });
    } catch (error) {
        console.error('Error getting announcement:', error);
        res.status(500).json({ message: 'Error retrieving announcement' });
    }
});

// Create new announcement (supports multiple active announcements)
router.post('/', async (req, res) => {
    try {
        const { content, createdBy = 'CEO', startAt: startAtInput, endAt: endAtInput } = req.body;
        
        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }

        const windowResult = parseAnnouncementWindow(startAtInput, endAtInput);
        if (windowResult.error) {
            return res.status(400).json({ message: windowResult.error });
        }

        const { startAt, endAt } = windowResult;

        const overlappingCount = await Announcement.countDocuments({
            isActive: true,
            startAt: { $lte: endAt },
            endAt: { $gte: startAt }
        });

        if (overlappingCount >= 20) {
            return res.status(400).json({ message: 'Too many active announcements in the selected time range' });
        }

        // Create new announcement
        const announcement = new Announcement({
            content,
            createdBy,
            startAt,
            endAt,
            isActive: true
        });

        announcement.updatedAt = new Date();

        await announcement.save();
        
        res.json({ 
            message: 'Announcement created successfully',
            announcement: announcement.content,
            _id: announcement._id,
            startAt: announcement.startAt,
            endAt: announcement.endAt
        });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ message: 'Error updating announcement' });
    }
});

// Delete one announcement by id
router.delete('/:id', async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id,
            { isActive: false, updatedAt: new Date() },
            { new: true }
        );

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.json({
            message: 'Announcement deleted successfully',
            _id: announcement._id
        });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ message: 'Error deleting announcement' });
    }
});

// Delete all current active announcements
router.delete('/', async (req, res) => {
    try {
        const now = new Date();
        const result = await Announcement.updateMany(
            {
                isActive: true,
                startAt: { $lte: now },
                endAt: { $gte: now }
            },
            { isActive: false, updatedAt: now }
        );

        res.json({ 
            message: 'Active announcements deleted successfully',
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
            .sort({ createdAt: -1, startAt: -1 })
            .limit(10);
        
        res.json(announcements);
    } catch (error) {
        console.error('Error getting announcement history:', error);
        res.status(500).json({ message: 'Error retrieving history' });
    }
});

module.exports = router;