const { MongoClient } = require('mongodb');

// Test MongoDB connection with your credentials
const MONGODB_URI = "mongodb+srv://neriesap:nerie12345@jackassguildrotation.n2lvdne.mongodb.net/?appName=JackassGuildRotation";

async function testConnection() {
    console.log('Testing MongoDB connection...');
    
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ MongoDB connection successful!');
        
        const db = client.db('guildLootRotation');
        const collections = await db.listCollections().toArray();
        console.log('📁 Collections found:', collections.map(c => c.name));
        
        // Test basic operations
        const testCollection = db.collection('test');
        await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
        console.log('✅ Write operation successful!');
        
        const result = await testCollection.findOne({ test: 'connection' });
        console.log('✅ Read operation successful:', result);
        
        await testCollection.deleteOne({ test: 'connection' });
        console.log('✅ Delete operation successful!');
        
        await client.close();
        console.log('✅ Connection closed successfully');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('Full error:', error);
    }
}

testConnection();
