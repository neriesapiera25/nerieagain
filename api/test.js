const { MongoClient } = require('mongodb');

// MongoDB connection cache
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient('mongodb+srv://neriesap:nerie12345@jackassguildrotation.n2lvdne.mongodb.net/?appName=JackassGuildRotation');
  await client.connect();
  const db = client.db('guildLootRotation');
  
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('Testing MongoDB connection...');
    
    const { db, client } = await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    // Test basic operations
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    // Test write operation
    const testCollection = db.collection('test');
    const testDoc = { 
      test: 'connection', 
      timestamp: new Date(),
      testId: Math.random().toString(36).substr(2, 9)
    };
    
    await testCollection.insertOne(testDoc);
    console.log('✅ Write operation successful');
    
    // Test read operation
    const readResult = await testCollection.findOne({ test: 'connection' });
    console.log('✅ Read operation successful');
    
    // Clean up
    await testCollection.deleteOne({ test: 'connection' });
    console.log('✅ Delete operation successful');
    
    // Get main data
    const mainData = await db.collection('guildData').findOne({ type: 'main' });
    
    res.status(200).json({
      success: true,
      message: 'MongoDB connection test successful!',
      details: {
        connected: true,
        collections: collections.map(c => c.name),
        testWrite: true,
        testRead: true,
        testDelete: true,
        mainDataExists: !!mainData,
        guildMembersCount: mainData?.guildMembers?.length || 0,
        lootItemsCount: mainData?.lootItems?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'MongoDB connection failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
