const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const MONGO_URI  = process.env.MONGO_URI || 'mongodb+srv://kgr2ram_db_user:oaXJfmN77ucifqpt@cluster0.ww2bovl.mongodb.net/?appName=Cluster0';
const DB_NAME    = 'builder';
const COLLECTION = 'builder';
const PORT       = process.env.PORT || 3000;

let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Connected to MongoDB Atlas');
}

/* ── Form routes (per session ID) ── */

app.get('/api/load/:id', async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).findOne({ _id: req.params.id });
    res.json({ ok: true, data: doc ? doc.data : {} });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/save/:id', async (req, res) => {
  try {
    const { data } = req.body;
    await db.collection(COLLECTION).updateOne(
      { _id: req.params.id },
      { $set: { data, savedAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/api/reset/:id', async (req, res) => {
  try {
    await db.collection(COLLECTION).deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

/* ── Submissions list ── */

app.get('/api/submissions', async (req, res) => {
  try {
    const docs = await db.collection(COLLECTION)
      .find({}, { projection: {
        'data.builder_name': 1,
        'data.project_name': 1,
        'data.email': 1,
        'data.phone': 1,
        savedAt: 1
      }})
      .sort({ savedAt: -1 })
      .toArray();
    res.json({ ok: true, submissions: docs });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.delete('/api/submissions/:id', async (req, res) => {
  try {
    await db.collection(COLLECTION).deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

/* ── Pages ── */

app.get('/submissions', (req, res) => {
  res.sendFile(path.join(__dirname, 'submissions.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err); process.exit(1); });
