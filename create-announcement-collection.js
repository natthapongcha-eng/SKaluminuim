const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Announcement = require('./models/Announcement');

async function createAnnouncementCollection() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // Create collection by saving a document
        const announcement = new Announcement({
            content: 'ยินดีต้อนรับสู่ระบบประกาศของ SK Aluminium!',
            createdBy: 'System',
            isActive: true
        });

        await announcement.save();
        console.log('✅ Announcement collection created and document saved!');
        console.log('📄 Document:', announcement);

        // Verify collection exists
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const announcementExists = collections.some(c => c.name === 'announcements');
        
        console.log('\n📊 Collections in sk_aluminium database:');
        collections.forEach(c => console.log(`   - ${c.name}`));
        
        console.log(`\n${announcementExists ? '✅' : '❌'} Announcements collection: ${announcementExists ? 'EXISTS' : 'NOT FOUND'}`);

        await mongoose.connection.close();
        console.log('\n✅ Done! You can now see "announcements" in MongoDB Compass');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createAnnouncementCollection();
