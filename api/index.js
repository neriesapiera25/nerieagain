const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);

// Configure Socket.io for Vercel
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MongoDB connection
let db;
let guildDataCollection;

async function connectToDatabase() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db();
    guildDataCollection = db.collection('guildData');
    console.log('Connected to MongoDB');
    
    // Initialize default data if empty
    const existingData = await guildDataCollection.findOne({ type: 'main' });
    if (!existingData) {
      await initializeDefaultData();
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

async function initializeDefaultData() {
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
  
  await guildDataCollection.insertOne(defaultData);
  console.log('Default data initialized');
}

// API Routes
app.get('/api/data', async (req, res) => {
  try {
    const data = await guildDataCollection.findOne({ type: 'main' });
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/api/data', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      lastUpdated: new Date().toISOString()
    };
    
    await guildDataCollection.updateOne(
      { type: 'main' },
      { $set: updateData },
      { upsert: true }
    );
    
    // Broadcast update to all connected clients
    io.emit('dataUpdate', updateData);
    
    res.json({ success: true, message: 'Data updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update data' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current data to newly connected client
  guildDataCollection.findOne({ type: 'main' }).then(data => {
    if (data) {
      socket.emit('dataUpdate', data);
    }
  });
  
  socket.on('dataUpdate', async (data) => {
    try {
      const updateData = {
        ...data,
        lastUpdated: new Date().toISOString()
      };
      
      await guildDataCollection.updateOne(
        { type: 'main' },
        { $set: updateData },
        { upsert: true }
      );
      
      // Broadcast to all other clients
      socket.broadcast.emit('dataUpdate', updateData);
    } catch (error) {
      socket.emit('error', { message: 'Failed to update data' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize database connection
connectToDatabase().catch(console.error);

// Export for Vercel
module.exports = app;
