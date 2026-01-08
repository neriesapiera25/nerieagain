const { MongoClient } = require('mongodb');

// MongoDB connection cache for serverless
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

async function initializeDefaultData(collection) {
  const defaultData = {
    type: 'main',
    guildMembers: [
      { id: 1, name: "Marco", class: 'Member', joinDate: new Date().toISOString() },
      { id: 2, name: "Cart", class: 'Member', joinDate: new Date().toISOString() },
      { id: 3, name: "Khin", class: 'Member', joinDate: new Date().toISOString() },
      { id: 4, name: "Nok", class: 'Member', joinDate: new Date().toISOString() },
      { id: 5, name: "Miles", class: 'Member', joinDate: new Date().toISOString() },
      { id: 6, name: "Sny", class: 'Member', joinDate: new Date().toISOString() },
      { id: 7, name: "Econg", class: 'Member', joinDate: new Date().toISOString() },
      { id: 8, name: "Pennis", class: 'Member', joinDate: new Date().toISOString() },
      { id: 9, name: "Badboy", class: 'Member', joinDate: new Date().toISOString() },
      { id: 10, name: "Akiro", class: 'Member', joinDate: new Date().toISOString() },
      { id: 11, name: "Touch", class: 'Member', joinDate: new Date().toISOString() },
      { id: 12, name: "Cap", class: 'Member', joinDate: new Date().toISOString() },
      { id: 13, name: "Conrad", class: 'Member', joinDate: new Date().toISOString() },
      { id: 14, name: "Thalium", class: 'Member', joinDate: new Date().toISOString() },
      { id: 15, name: "Guess", class: 'Member', joinDate: new Date().toISOString() },
      { id: 16, name: "Rex", class: 'Member', joinDate: new Date().toISOString() },
      { id: 17, name: "Blake", class: 'Member', joinDate: new Date().toISOString() },
      { id: 18, name: "Doz", class: 'Member', joinDate: new Date().toISOString() },
      { id: 19, name: "DeathHunter", class: 'Member', joinDate: new Date().toISOString() },
      { id: 20, name: "Kamotemaru", class: 'Member', joinDate: new Date().toISOString() },
      { id: 21, name: "DK", class: 'Member', joinDate: new Date().toISOString() },
      { id: 22, name: "Trez", class: 'Member', joinDate: new Date().toISOString() },
      { id: 23, name: "3 man arrow", class: 'Member', joinDate: new Date().toISOString() },
      { id: 24, name: "Claire", class: 'Member', joinDate: new Date().toISOString() }
    ],
    lootItems: [
      { id: 1, name: 'COC', type: 'Champion', rarity: 'Legendary', addedDate: new Date().toISOString() },
      { id: 2, name: 'AA', type: 'Armor', rarity: 'Epic', addedDate: new Date().toISOString() },
      { id: 3, name: 'Feather', type: 'Accessory', rarity: 'Rare', addedDate: new Date().toISOString() },
      { id: 4, name: 'Flame', type: 'Weapon', rarity: 'Epic', addedDate: new Date().toISOString() },
      { id: 5, name: 'AA (blessed)', type: 'Armor', rarity: 'Legendary', addedDate: new Date().toISOString() }
    ],
    lootRotations: {
      "COC": ["Marco", "Cart", "Khin", "Nok", "Miles", "Sny", "Econg", "Pennis", "Badboy", "Akiro", "Touch", "Cap", "Conrad", "Thalium", "Guess", "Rex", "Blake", "Doz", "DeathHunter", "Kamotemaru", "DK", "Trez", "3 man arrow", "Claire"],
      "Feather": ["Trez", "DK", "Kamotemaru", "DeathHunter", "Doz", "Blake", "Guess", "Rex", "Econg", "Conrad", "Akiro", "Touch", "Cap", "Akiro", "Badboy", "Thalium", "Pennis", "Miles", "Nok", "Khin", "Cart", "Marco", "Claire", "3 man arrow"],
      "Flame": ["Conrad", "Nok", "DeathHunter", "Kamotemaru", "Econg", "Guess", "Khin", "Doz", "Badboy", "Miles", "Touch", "Sny", "Marco", "Cap", "Blake", "Trez", "Cart", "Thalium", "Rex", "Pennis", "Akiro", "DK", "3 man arrow", "Claire"],
      "AA": ["3 man arrow", "Guess", "Claire", "Cap", "Trez", "DeathHunter", "Miles", "Cart", "Badboy", "Sny", "Marco", "Pennis", "Nok", "Econg", "Blake", "Khin", "Kamotemaru", "Akiro", "Touch", "DK", "Conrad", "Doz", "Rex", "Thalium"],
      "AA (blessed)": []
    },
    rotationHistory: [],
    currentPositions: {},
    rotationsToday: 0,
    playerSkipCounts: {},
    skippedItems: [],
    highlightedItems: [],
    currentLootState: {},
    currentPlayerRotation: {},
    playerLootStatus: {},
    rotationQueue: [],
    lastUpdated: new Date().toISOString()
  };
  
  await collection.insertOne(defaultData);
  return defaultData;
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('guildData');

    if (req.method === 'GET') {
      let data = await collection.findOne({ type: 'main' });
      
      // Initialize default data if not exists
      if (!data) {
        data = await initializeDefaultData(collection);
      }
      
      res.status(200).json(data);
    } 
    else if (req.method === 'POST') {
      const updateData = {
        ...req.body,
        type: 'main',
        lastUpdated: new Date().toISOString()
      };
      
      await collection.updateOne(
        { type: 'main' },
        { $set: updateData },
        { upsert: true }
      );
      
      res.status(200).json({ success: true, message: 'Data updated successfully', lastUpdated: updateData.lastUpdated });
    } 
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
