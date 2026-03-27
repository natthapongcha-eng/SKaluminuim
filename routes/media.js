const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');
const Project = require('../models/Project');
const Quotation = require('../models/Quotation');

const MEDIA_BACKUP_ROOT = path.join(__dirname, '..', 'uploads', 'media', 'by-project');
const QUOTATION_MEDIA_BACKUP_ROOT = path.join(__dirname, '..', 'uploads', 'media', 'by-quotation');

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

const STAGE_ALIASES = {
    before: 'before',
    during: 'during',
    after: 'after',
    'รูปก่อนติดตั้ง': 'before',
    'รูประหว่างติดตั้ง': 'during',
    'รูปหลังติดตั้ง': 'after'
};

function normalizeStage(stage, fallback = '') {
    const key = String(stage || '').trim().toLowerCase();
    return STAGE_ALIASES[key] || STAGE_ALIASES[String(stage || '').trim()] || fallback;
}

function normalizeMediaType(mediaType) {
    const normalized = String(mediaType || '').trim().toLowerCase();
    return (normalized === 'quotation' || normalized === 'quota') ? 'quotation' : 'project';
}

function toApiMedia(doc) {
    const item = doc.toObject ? doc.toObject() : doc;
    item.stage = normalizeStage(item.stage, 'before');
    item.imageUrl = `/api/media/${item._id}/file`;
    return item;
}

// Configure multer for file upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Accept image and PDF files
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only image and PDF files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET all media with optional filters
router.get('/', async (req, res) => {
    try {
        const { projectId, stage, mediaType, quotationId } = req.query;
        let filter = {};
        const normalizedMediaType = mediaType ? normalizeMediaType(mediaType) : '';

        if (normalizedMediaType) {
            filter.mediaType = normalizedMediaType;
        }
        
        if (projectId && projectId !== 'all') {
            filter.projectId = projectId;
        }
        if (quotationId && quotationId !== 'all') {
            filter.quotationId = quotationId;
        }
        if (stage && stage !== 'all') {
            const normalizedStage = normalizeStage(stage);
            if (normalizedStage) {
                filter.stage = normalizedStage;
            }
        }

        const media = await Media.find(filter)
            .select('-imageData')
            .populate('projectId', 'name customerId')
            .populate('quotationId', 'quotationNumber customerName')
            .populate('uploadedBy', 'username')
            .sort({ createdAt: -1 });

        res.json(media.map(toApiMedia));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET media stats
router.get('/stats', async (req, res) => {
    try {
        const totalMedia = await Media.countDocuments();
        const projectsWithMedia = await Media.distinct('projectId', {
            mediaType: { $ne: 'quotation' },
            projectId: { $ne: null }
        });
        const quotationsWithMedia = await Media.distinct('quotationId', {
            mediaType: 'quotation',
            quotationId: { $ne: null }
        });
        const totalSize = await Media.aggregate([
            { $group: { _id: null, totalSize: { $sum: '$size' } } }
        ]);

        res.json({
            totalMedia,
            projectsWithMedia: projectsWithMedia.length,
            quotationsWithMedia: quotationsWithMedia.length,
            totalSize: totalSize[0]?.totalSize || 0
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET media by project grouped by stage
router.get('/project/:projectId', async (req, res) => {
    try {
        const media = await Media.find({ projectId: req.params.projectId, mediaType: { $ne: 'quotation' } })
            .select('-imageData')
            .sort({ createdAt: -1 });

        // Group by stage
        const grouped = { before: [], during: [], after: [] };
        media.forEach(item => {
            const normalizedStage = normalizeStage(item.stage, 'before');
            grouped[normalizedStage].push(toApiMedia(item));
        });

        res.json(grouped);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST upload new media
router.post('/upload', upload.array('images', 10), async (req, res) => {
    try {
        const { projectId, stage, description, quotationId } = req.body;
        const mediaType = normalizeMediaType(req.body.mediaType);
        const uploadedBy = req.body.uploadedBy; // In real app, get from auth token
        const normalizedStage = mediaType === 'quotation' ? 'after' : normalizeStage(stage);

        if (mediaType === 'project' && (!projectId || !normalizedStage)) {
            return res.status(400).json({ message: 'projectId and stage are required' });
        }

        if (mediaType === 'quotation' && !quotationId) {
            return res.status(400).json({ message: 'quotationId is required for quotation media' });
        }

        if (!Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ message: 'At least one file is required' });
        }

        // Verify project/quotation exists
        if (mediaType === 'project') {
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
        }

        if (mediaType === 'quotation') {
            const quotation = await Quotation.findById(quotationId);
            if (!quotation) {
                return res.status(404).json({ message: 'Quotation not found' });
            }
        }

        const mediaFiles = [];

        for (const file of req.files) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const storedFilename = uniqueSuffix + path.extname(file.originalname);

            const media = new Media({
                filename: storedFilename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                mediaType,
                imageData: file.buffer,
                storageType: 'database',
                path: '',
                stage: normalizedStage,
                projectId: mediaType === 'project' ? projectId : undefined,
                quotationId: mediaType === 'quotation' ? quotationId : undefined,
                description: description,
                uploadedBy: uploadedBy
            });

            await media.save();
            mediaFiles.push(toApiMedia(media));
        }

        res.status(201).json({
            message: `${mediaFiles.length} files uploaded successfully`,
            media: mediaFiles
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE media by ID
router.delete('/:id', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        
        if (!media) {
            return res.status(404).json({ message: 'Media not found' });
        }

        // Delete file from disk for legacy records
        if (media.storageType === 'filesystem' && media.path) {
            const mediaPath = String(media.path || '').replace(/^[/\\]+/, '');
            const filePath = path.join(__dirname, '..', mediaPath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Media.findByIdAndDelete(req.params.id);
        res.json({ message: 'Media deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET media file by ID (supports database and legacy filesystem storage)
router.get('/:id/file', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id).select('imageData mimetype path storageType originalName');

        if (!media) {
            return res.status(404).json({ message: 'Media not found' });
        }

        if (media.imageData && media.imageData.length > 0) {
            res.setHeader('Content-Type', media.mimetype || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(media.imageData);
        }

        if (media.path) {
            const mediaPath = String(media.path || '').replace(/^[/\\]+/, '');
            const filePath = path.join(__dirname, '..', mediaPath);
            if (fs.existsSync(filePath)) {
                return res.sendFile(filePath);
            }
        }

        return res.status(404).json({ message: 'Media file not found' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// GET single media by ID
router.get('/:id', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id)
            .select('-imageData')
            .populate('projectId', 'name customerId')
            .populate('uploadedBy', 'username');

        if (!media) {
            return res.status(404).json({ message: 'Media not found' });
        }

        res.json(toApiMedia(media));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
