const express = require('express');
const router = express.Router();
const User = require('../models/User');

function buildDisplayName(user) {
    const firstName = (user.firstName || '').trim();
    const lastName = (user.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.name || '';
}

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const normalizedRole = String(role || '').trim().toUpperCase();
        const loginQuery = { email, password };

        if (normalizedRole === 'EMPLOYEE') {
            // Keep UI as Employee, but allow ADMIN users to sign in through the same option.
            loginQuery.role = { $in: ['EMPLOYEE', 'ADMIN'] };
        } else if (normalizedRole) {
            loginQuery.role = normalizedRole;
        }

        const user = await User.findOne(loginQuery);
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Email, password, or role is incorrect.' });
        }
        
        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                profileImage: user.profileImage || '',
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single user profile
router.get('/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: buildDisplayName(user),
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                profileImage: user.profileImage || '',
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user profile by email (fallback for old session format)
router.post(['/profile-by-email', '/profile/by-email'], async (req, res) => {
    try {
        const email = (req.body.email || '').trim();
        const role = (req.body.role || '').trim();

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const query = role ? { email, role } : { email };
        const user = await User.findOne(query).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: buildDisplayName(user),
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                profileImage: user.profileImage || '',
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update user profile (name/surname/phone only)
router.put('/profile/:id', async (req, res) => {
    try {
        const firstName = (req.body.firstName || '').trim();
        const lastName = (req.body.lastName || '').trim();
        const phone = (req.body.phone || '').trim();
        const profileImage = typeof req.body.profileImage === 'string' ? req.body.profileImage : undefined;
        const name = `${firstName} ${lastName}`.trim();

        const updateData = { firstName, lastName, phone, name };
        if (profileImage !== undefined) {
            updateData.profileImage = profileImage;
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                email: user.email,
                name: buildDisplayName(user),
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                profileImage: user.profileImage || '',
                role: user.role
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update user profile by email (fallback for old session format)
router.put(['/profile-by-email', '/profile/by-email'], async (req, res) => {
    try {
        const email = (req.body.email || '').trim();
        const role = (req.body.role || '').trim();
        const firstName = (req.body.firstName || '').trim();
        const lastName = (req.body.lastName || '').trim();
        const phone = (req.body.phone || '').trim();
        const profileImage = typeof req.body.profileImage === 'string' ? req.body.profileImage : undefined;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const name = `${firstName} ${lastName}`.trim();
        const query = role ? { email, role } : { email };

        const updateData = { firstName, lastName, phone, name };
        if (profileImage !== undefined) {
            updateData.profileImage = profileImage;
        }

        const user = await User.findOneAndUpdate(
            query,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                email: user.email,
                name: buildDisplayName(user),
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                profileImage: user.profileImage || '',
                role: user.role
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Get all users (CEO only)
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create user
router.post('/users', async (req, res) => {
    try {
        const user = new User(req.body); // new User() = สร้าง document ใหม่ตาม schema
        await user.save(); // บันทึกลง MongoDB
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update user
router.put('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
