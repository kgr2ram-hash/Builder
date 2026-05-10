const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const MONGO_URI = 'mongodb+srv://kgr2ram_db_user:oaXJfmN77ucifqpt@cluster0.ww2bovl.mongodb.net/?appName=Cluster0';
const DB_NAME   = 'builder';
const COLLECTION = 'builder';
const DOC_ID    = 'form-v1';

let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Connected to MongoDB Atlas');
}

app.get('/api/load', async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).findOne({ _id: DOC_ID });
    res.json({ ok: true, data: doc ? doc.data : {} });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/save', async (req, res) => {
  try {
    const { data } = req.body;
    await db.collection(COLLECTION).updateOne(
      { _id: DOC_ID },
      { $set: { data, savedAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/reset', async (req, res) => {
  try {
    await db.collection(COLLECTION).deleteOne({ _id: DOC_ID });
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

connectDB()
  .then(() => app.listen(3000, () => console.log('Server running at http://localhost:3000')))
  .catch(err => { console.error('MongoDB connection failed:', err); process.exit(1); });
