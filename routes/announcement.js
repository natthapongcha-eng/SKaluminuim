const express = require('express');
const router = express.Router();

// In-memory storage for announcements (replace with database in production)
let announcement = '';

// Get the current announcement
router.get('/', (req, res) => {
    res.json({ announcement });
});

// Update the announcement
router.post('/', (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }
    announcement = content;
    res.json({ message: 'Announcement updated successfully' });
});

module.exports = router;