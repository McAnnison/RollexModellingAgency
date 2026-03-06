/*
  Express + MongoDB backend for Rolex Modelling Agency.
  Replaces the previous Firebase Cloud Functions setup.

  Setup:
  1) Install dependencies: cd functions && npm install
  2) Copy .env.example to .env and fill in values
  3) Create the admin account: npm run create-admin
  4) Start the server: npm start  (or npm run dev for auto-restart)

  Environment variables (see .env.example):
    MONGODB_URI        - MongoDB connection string
    JWT_SECRET         - Secret for signing JWT tokens
    SENDGRID_KEY       - SendGrid API key (optional - emails skipped if absent)
    EMAIL_FROM         - Sender address
    EMAIL_ADMIN        - Address that receives new-application notifications
    UPLOADS_DIR        - Absolute path to store uploaded files (default: ./uploads)
    PORT               - HTTP port (default: 3000)
    CORS_ORIGIN        - Allowed origin(s) for CORS (default: *)
*/

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// --- Config ------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rollex';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const SENDGRID_KEY = process.env.SENDGRID_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const EMAIL_ADMIN = process.env.EMAIL_ADMIN || '';
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// --- MongoDB Models ----------------------------------------------------------

const applicationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, index: true },
    fullName: String,
    email: String,
    phone: String,
    instagram: String,
    heightCm: Number,
    waistCm: Number,
    shoeSizeEU: String,
    eyeColor: String,
    paymentRef: String,
    paymentMethod: String,
    paymentCode: String,
    paymentAmount: Number,
    paymentCurrency: String,
    paymentStatus: { type: String, default: 'pending' },
    status: { type: String, default: 'submitted' },
    userAgent: String,
    uploads: {
      headshot: {
        path: String,
        contentType: String,
        size: Number,
        name: String,
        filename: String,
      },
      runway: {
        path: String,
        contentType: String,
        size: Number,
        name: String,
        filename: String,
      },
      fullBody: {
        path: String,
        contentType: String,
        size: Number,
        name: String,
        filename: String,
      },
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

const paymentCodeSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    amount: Number,
    currency: { type: String, default: 'NGN' },
    createdBy: String,
    used: { type: Boolean, default: false },
    usedAt: Date,
    usedBy: String,
  },
  { timestamps: true }
);

const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
  },
  { timestamps: true }
);

const Application = mongoose.model('Application', applicationSchema);
const PaymentCode = mongoose.model('PaymentCode', paymentCodeSchema);
const AdminUser = mongoose.model('AdminUser', adminUserSchema);

// --- File Storage (Multer) ---------------------------------------------------

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const appId = req._uploadAppId || 'tmp';
    const dir = path.join(UPLOADS_DIR, appId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const rawExt = path.extname(file.originalname || '');
    const ext = rawExt.replace(/[^a-z0-9.]/gi, '').slice(0, 10);
    cb(null, `${file.fieldname}${ext ? '.' + ext.replace('.', '') : ''}`);
  },
});

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/quicktime',
]);

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: function (req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('File type not allowed: ' + file.mimetype));
    }
    cb(null, true);
  },
});

// --- Auth Helpers ------------------------------------------------------------

function signAdminToken(adminId, email) {
  return jwt.sign({ sub: String(adminId), email, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
}

function requireAdmin(req, res, next) {
  // Accept token from Authorization header or ?token= query param (for window.open file downloads)
  const header = req.headers.authorization || '';
  const token = (header.startsWith('Bearer ') ? header.slice(7) : null) ||
    (req.query && req.query.token ? String(req.query.token) : null);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// --- Email Helper ------------------------------------------------------------

async function sendEmails(applicationId, data) {
  if (!SENDGRID_KEY || !EMAIL_FROM) return;
  try {
    sgMail.setApiKey(SENDGRID_KEY);
    const applicantName = String(data.fullName || '').trim();
    const applicantEmail = String(data.email || '').trim();

    if (EMAIL_ADMIN) {
      await sgMail.send({
        to: EMAIL_ADMIN,
        from: EMAIL_FROM,
        subject: 'New registration: ' + (applicantName || 'Applicant') + ' (' + applicationId + ')',
        text:
          'A new student registered.\n\n' +
          'Name: ' + (applicantName || '(not provided)') + '\n' +
          'Email: ' + (applicantEmail || '(not provided)') + '\n' +
          'Phone: ' + (data.phone || '(not provided)') + '\n' +
          'Instagram: ' + (data.instagram || '(not provided)') + '\n' +
          'Application ID: ' + applicationId + '\n\n' +
          'View in MongoDB -> applications -> ' + applicationId,
      });
    }

    if (applicantEmail) {
      await sgMail.send({
        to: applicantEmail,
        from: EMAIL_FROM,
        subject: 'We received your registration',
        text:
          'Hi ' + (applicantName || 'there') + ',\n\n' +
          "Thanks for registering — we've received your submission.\n" +
          'Your reference ID is: ' + applicationId + '.\n\n' +
          "We'll contact you with next steps.\n\n" +
          'Rolex Modelling Agency',
      });
    }
  } catch (err) {
    // Email failures should not break the application flow
    console.error('Email error:', err.message || err);
  }
}

// --- App ---------------------------------------------------------------------

const app = express();

app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Routes ------------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// POST /api/auth/login  { email, password }
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const adminUser = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!adminUser) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, adminUser.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signAdminToken(adminUser._id, adminUser.email);
    res.json({ token, email: adminUser.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/applications  (multipart/form-data)
app.post(
  '/api/applications',
  (req, res, next) => {
    // Pre-assign a temp ID so multer can create the right folder
    req._uploadAppId = uuidv4();
    next();
  },
  upload.fields([
    { name: 'headshot', maxCount: 1 },
    { name: 'runway', maxCount: 1 },
    { name: 'fullBody', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const body = req.body || {};
      const files = req.files || {};

      const fileInfo = function (field) {
        const arr = files[field];
        if (!arr || !arr.length) return null;
        const f = arr[0];
        return {
          path: path.join(req._uploadAppId, f.filename),
          filename: f.filename,
          contentType: f.mimetype || null,
          size: f.size || null,
          name: f.originalname || null,
        };
      };

      const newApp = new Application({
        sessionId: String(body.sessionId || '').trim() || uuidv4(),
        fullName: String(body.fullName || '').trim(),
        email: String(body.email || '').trim(),
        phone: String(body.phone || '').trim(),
        instagram: String(body.instagram || '').trim(),
        heightCm: Number(body.heightCm) || null,
        waistCm: Number(body.waistCm) || null,
        shoeSizeEU: String(body.shoeSizeEU || '').trim(),
        eyeColor: String(body.eyeColor || '').trim(),
        paymentRef: String(body.paymentRef || '').trim() || null,
        paymentMethod: String(body.paymentMethod || '').trim() || null,
        paymentCode: String(body.paymentCode || '').trim() || null,
        paymentAmount: Number(body.paymentAmount) || null,
        paymentCurrency: String(body.paymentCurrency || '').trim() || null,
        paymentStatus: body.paymentRef ? 'paid' : 'pending',
        status: 'submitted',
        userAgent: String(body.userAgent || req.headers['user-agent'] || '').slice(0, 300),
        uploads: {
          headshot: fileInfo('headshot'),
          runway: fileInfo('runway'),
          fullBody: fileInfo('fullBody'),
        },
      });

      // Move uploaded files to a directory named after the real Mongo _id
      const appId = String(newApp._id);
      const tmpDir = path.join(UPLOADS_DIR, req._uploadAppId);
      const finalDir = path.join(UPLOADS_DIR, appId);
      if (fs.existsSync(tmpDir)) {
        fs.renameSync(tmpDir, finalDir);
      }

      // Update stored paths to use the real ID
      ['headshot', 'runway', 'fullBody'].forEach((key) => {
        const info = newApp.uploads[key];
        if (info && info.filename) {
          info.path = path.join(appId, info.filename);
        }
      });

      await newApp.save();

      // Fire-and-forget emails
      sendEmails(appId, newApp).catch(() => {});

      res.status(201).json({ id: appId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Submission failed' });
    }
  }
);

// GET /api/applications  (admin only)
app.get('/api/applications', requireAdmin, async (req, res) => {
  try {
    const apps = await Application.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(apps.map((a) => ({
      id: String(a._id),
      fullName: a.fullName,
      email: a.email,
      phone: a.phone,
      instagram: a.instagram,
      heightCm: a.heightCm,
      waistCm: a.waistCm,
      shoeSizeEU: a.shoeSizeEU,
      eyeColor: a.eyeColor,
      paymentStatus: a.paymentStatus,
      status: a.status,
      createdAt: a.createdAt,
      uploads: a.uploads,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch applications' });
  }
});

// GET /api/my-applications?sessionId=xxx
app.get('/api/my-applications', async (req, res) => {
  try {
    const sessionId = String(req.query.sessionId || '').trim();
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const apps = await Application.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(apps.map((a) => ({
      id: String(a._id),
      status: a.status,
      createdAt: a.createdAt,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch submissions' });
  }
});

// PATCH /api/applications/:id  (admin only)  { status }
app.patch('/api/applications/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ['submitted', 'reviewing', 'approved', 'rejected'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const found = await Application.findByIdAndUpdate(id, { status }, { new: true });
    if (!found) return res.status(404).json({ error: 'Application not found' });

    res.json({ id: String(found._id), status: found.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to update application' });
  }
});

// GET /api/applications/:id/files/:kind  (admin only)
app.get('/api/applications/:id/files/:kind', requireAdmin, async (req, res) => {
  try {
    const { id, kind } = req.params;
    if (!['headshot', 'runway', 'fullBody'].includes(kind)) {
      return res.status(400).json({ error: 'Invalid file kind' });
    }

    const found = await Application.findById(id).lean();
    if (!found) return res.status(404).json({ error: 'Application not found' });

    const fileInfo = found.uploads && found.uploads[kind];
    if (!fileInfo || !fileInfo.path) return res.status(404).json({ error: 'File not found' });

    const filePath = path.join(UPLOADS_DIR, fileInfo.path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

    if (fileInfo.contentType) res.setHeader('Content-Type', fileInfo.contentType);
    if (fileInfo.name) {
      const safeName = fileInfo.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      res.setHeader('Content-Disposition', 'inline; filename="' + safeName + '"');
    }
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to retrieve file' });
  }
});

// POST /api/payment-codes  (admin only)  { amount? }
function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return 'RM-' + out;
}

app.post('/api/payment-codes', requireAdmin, async (req, res) => {
  try {
    const amount = Number(req.body && req.body.amount) || null;
    const code = generateCode();

    await PaymentCode.create({
      code,
      amount,
      currency: 'NGN',
      createdBy: req.admin.email,
      used: false,
    });

    res.status(201).json({ code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to generate code' });
  }
});

// POST /api/payment-codes/redeem  { code, sessionId? }
app.post('/api/payment-codes/redeem', async (req, res) => {
  try {
    const code = String((req.body && req.body.code) || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const record = await PaymentCode.findOne({ code });
    if (!record) return res.status(404).json({ error: 'Invalid code' });
    if (record.used) return res.status(409).json({ error: 'Code already used' });

    record.used = true;
    record.usedAt = new Date();
    record.usedBy = String((req.body && req.body.sessionId) || '').trim() || null;
    await record.save();

    res.json({ ok: true, code, amount: record.amount, currency: record.currency });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to redeem code' });
  }
});

// --- Connect & Listen --------------------------------------------------------

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB:', MONGODB_URI.replace(/\/\/[^@]*@/, '//***@'));
    app.listen(PORT, () => {
      console.log('Server listening on http://localhost:' + PORT);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app; // for testing
