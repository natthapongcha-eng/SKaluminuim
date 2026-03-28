require('dotenv').config();
const mongoose = require('mongoose');
const Media = require('../models/Media');

(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_FALLBACK;
    if (!uri) {
        throw new Error('MONGODB_URI is not set');
    }

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4
    });

    const result = await Media.updateMany(
        { mediaType: 'quotation', stage: { $exists: true } },
        { $unset: { stage: '' } }
    );

    console.log(
        JSON.stringify({
            matched: result.matchedCount ?? result.n ?? 0,
            modified: result.modifiedCount ?? result.nModified ?? 0
        })
    );

    await mongoose.disconnect();
})().catch(async (error) => {
    console.error(error.message || error);
    try {
        await mongoose.disconnect();
    } catch (_e) {
        // ignore
    }
    process.exit(1);
});
