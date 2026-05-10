const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://kgr2ram_db_user:oaXJfmN77ucifqpt@cluster0.ww2bovl.mongodb.net/?appName=Cluster0';
const DB_NAME   = 'builder';
const PORT      = process.env.PORT || 3000;

const TAB_IDS = [
  'builder-project', 'scope-matrix', 'pre-construction', 'substructure',
  'structure-masonry', 'waterproofing-roof', 'finishes', 'doors-joinery',
  'plumbing-sanitary', 'electrical-hvac', 'external-lifecycle', 'commercial', 'qa-handover'
];

function colName(tabId) {
  return 'tab_' + tabId.replace(/-/g, '_');
}

let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Connected to MongoDB Atlas');
}

/* ── Load all tabs for a session ── */
app.get('/api/load/:sessionId', async (req, res) => {
  try {
    const tabs = await Promise.all(
      TAB_IDS.map(tabId =>
        db.collection(colName(tabId))
          .findOne({ _id: req.params.sessionId })
          .then(doc => ({ tabId, data: doc?.data || {} }))
      )
    );
    res.json({ ok: true, tabs });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

/* ── Save a specific tab ── */
app.post('/api/save/:sessionId/:tabId', async (req, res) => {
  try {
    const { data } = req.body;
    await db.collection(colName(req.params.tabId)).updateOne(
      { _id: req.params.sessionId },
      { $set: { data, savedAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

/* ── Reset: delete all tab docs for a session ── */
app.post('/api/reset/:sessionId', async (req, res) => {
  try {
    await Promise.all(
      TAB_IDS.map(tabId =>
        db.collection(colName(tabId)).deleteOne({ _id: req.params.sessionId })
      )
    );
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

/* ── Submissions list (from builder-project collection) ── */
app.get('/api/submissions', async (req, res) => {
  try {
    const docs = await db.collection('tab_builder_project')
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

/* ── Delete a submission: remove from all tab collections ── */
app.delete('/api/submissions/:sessionId', async (req, res) => {
  try {
    await Promise.all(
      TAB_IDS.map(tabId =>
        db.collection(colName(tabId)).deleteOne({ _id: req.params.sessionId })
      )
    );
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
