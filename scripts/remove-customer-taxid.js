require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_FALLBACK;

if (!uri) {
  console.error('Missing MONGODB_URI or MONGODB_URI_FALLBACK in .env');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });

    const beforeTaxId = await Customer.collection.countDocuments({ taxId: { $exists: true } });
    const beforetaxid = await Customer.collection.countDocuments({ taxid: { $exists: true } });

    const result = await Customer.collection.updateMany(
      {},
      { $unset: { taxId: '', taxid: '' } }
    );

    const afterTaxId = await Customer.collection.countDocuments({ taxId: { $exists: true } });
    const aftertaxid = await Customer.collection.countDocuments({ taxid: { $exists: true } });

    console.log(
      JSON.stringify(
        {
          beforeTaxId,
          beforetaxid,
          matched: result.matchedCount,
          modified: result.modifiedCount,
          afterTaxId,
          aftertaxid
        },
        null,
        2
      )
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    try {
      await mongoose.disconnect();
    } catch (_) {
      // no-op
    }
    process.exit(1);
  }
})();
