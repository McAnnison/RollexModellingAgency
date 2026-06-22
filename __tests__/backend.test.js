/**
 * Unit tests for the Express backend (functions/index.js).
 *
 * MongoDB, SendGrid and filesystem side-effects are mocked so that tests run
 * without any external dependencies.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Mocks – must be declared BEFORE requiring the module under test
// ---------------------------------------------------------------------------

// Mongoose mock ---------------------------------------------------------------
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockLean = jest.fn();
const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
const mockFind = jest.fn().mockReturnValue({ sort: mockSort });
const mockFindOne = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockCreate = jest.fn();

function MockModel(data) {
  Object.assign(this, data);
  this._id = this._id || 'mock-id-123';
  this.save = mockSave;
}
MockModel.find = mockFind;
MockModel.findOne = mockFindOne;
MockModel.findById = jest.fn().mockReturnValue({ lean: mockFindById });
MockModel.findByIdAndUpdate = mockFindByIdAndUpdate;
MockModel.create = mockCreate;

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    Schema: actualMongoose.Schema,
    model: jest.fn(() => MockModel),
    connect: jest.fn().mockResolvedValue(undefined),
  };
});

// SendGrid mock ---------------------------------------------------------------
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

// UUID mock -------------------------------------------------------------------
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-' + (++mockUuidCounter)),
}));

// Multer mock – skip real disk writes -----------------------------------------
jest.mock('multer', () => {
  const multerMock = jest.fn(() => ({
    fields: () => (req, res, next) => {
      req.files = req.__testFiles || {};
      next();
    },
  }));
  multerMock.diskStorage = jest.fn(() => ({}));
  return multerMock;
});

// Suppress server listen during tests
const originalListen = (app) => app; // no-op
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// We need to set env vars BEFORE requiring the module
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test-rollex';

// Now require the app (it calls mongoose.connect which is mocked above)
const request = require('supertest');
const app = require('../functions/index');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function adminToken(payload) {
  return jwt.sign(
    { sub: 'admin-1', email: 'admin@test.com', role: 'admin', ...payload },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// --- Auth: POST /api/auth/login -------------------------------------------

describe('POST /api/auth/login', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 400 when email or password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 401 when user not found', async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when password does not match', async () => {
    const hash = await bcrypt.hash('correct', 10);
    mockFindOne.mockResolvedValueOnce({ _id: '1', email: 'a@b.com', passwordHash: hash });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns a token on successful login', async () => {
    const hash = await bcrypt.hash('secret', 10);
    mockFindOne.mockResolvedValueOnce({ _id: 'admin-1', email: 'admin@test.com', passwordHash: hash });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toBe('admin@test.com');
    // Verify the token is valid
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('admin');
  });
});

// --- Applications: GET /api/applications (admin) --------------------------

describe('GET /api/applications', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('returns application list for admin', async () => {
    const mockApps = [
      {
        _id: 'app-1',
        fullName: 'Jane Doe',
        email: 'jane@test.com',
        phone: '123',
        instagram: '@jane',
        heightCm: 170,
        waistCm: 60,
        shoeSizeEU: '38',
        eyeColor: 'brown',
        paymentStatus: 'paid',
        status: 'submitted',
        createdAt: new Date().toISOString(),
        uploads: {},
      },
    ];
    mockLean.mockResolvedValueOnce(mockApps);

    const token = adminToken();
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe('app-1');
    expect(res.body[0].fullName).toBe('Jane Doe');
  });
});

// --- My Applications: GET /api/my-applications ----------------------------

describe('GET /api/my-applications', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 400 without sessionId', async () => {
    const res = await request(app).get('/api/my-applications');
    expect(res.status).toBe(400);
  });

  it('returns applications for a session', async () => {
    const mockApps = [
      { _id: 'app-2', status: 'reviewing', createdAt: new Date().toISOString() },
    ];
    mockLean.mockResolvedValueOnce(mockApps);

    const res = await request(app).get('/api/my-applications?sessionId=sess-abc');
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe('app-2');
    expect(res.body[0].status).toBe('reviewing');
  });
});

// --- PATCH /api/applications/:id ------------------------------------------

describe('PATCH /api/applications/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch('/api/applications/app-1')
      .send({ status: 'approved' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid status', async () => {
    const token = adminToken();
    const res = await request(app)
      .patch('/api/applications/app-1')
      .set('Authorization', 'Bearer ' + token)
      .send({ status: 'invalid-status' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status/i);
  });

  it('returns 404 when application is not found', async () => {
    mockFindByIdAndUpdate.mockResolvedValueOnce(null);
    const token = adminToken();
    const res = await request(app)
      .patch('/api/applications/nonexistent')
      .set('Authorization', 'Bearer ' + token)
      .send({ status: 'approved' });
    expect(res.status).toBe(404);
  });

  it('updates status successfully', async () => {
    mockFindByIdAndUpdate.mockResolvedValueOnce({ _id: 'app-1', status: 'approved' });
    const token = adminToken();
    const res = await request(app)
      .patch('/api/applications/app-1')
      .set('Authorization', 'Bearer ' + token)
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('accepts all valid statuses', async () => {
    const token = adminToken();
    for (const status of ['submitted', 'reviewing', 'approved', 'rejected']) {
      mockFindByIdAndUpdate.mockResolvedValueOnce({ _id: 'app-1', status });
      const res = await request(app)
        .patch('/api/applications/app-1')
        .set('Authorization', 'Bearer ' + token)
        .send({ status });
      expect(res.status).toBe(200);
    }
  });
});

// --- GET /api/applications/:id/files/:kind --------------------------------

describe('GET /api/applications/:id/files/:kind', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/applications/app-1/files/headshot');
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid file kind', async () => {
    const token = adminToken();
    const res = await request(app)
      .get('/api/applications/app-1/files/badkind')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(400);
  });

  it('returns 404 when application is not found', async () => {
    mockFindById.mockResolvedValueOnce(null);
    const token = adminToken();
    const res = await request(app)
      .get('/api/applications/app-1/files/headshot')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(404);
  });

  it('returns 404 when file info is missing', async () => {
    mockFindById.mockResolvedValueOnce({ _id: 'app-1', uploads: {} });
    const token = adminToken();
    const res = await request(app)
      .get('/api/applications/app-1/files/headshot')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(404);
  });

  it('accepts token via query param', async () => {
    mockFindById.mockResolvedValueOnce(null);
    const token = adminToken();
    const res = await request(app)
      .get('/api/applications/app-1/files/headshot?token=' + token);
    expect(res.status).toBe(404); // 404 because app not found, not 401
  });
});

// --- POST /api/payment-codes (admin) --------------------------------------

describe('POST /api/payment-codes', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/payment-codes')
      .send({ amount: 5000 });
    expect(res.status).toBe(401);
  });

  it('creates a payment code', async () => {
    mockCreate.mockResolvedValueOnce({});
    const token = adminToken();
    const res = await request(app)
      .post('/api/payment-codes')
      .set('Authorization', 'Bearer ' + token)
      .send({ amount: 5000 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('code');
    expect(res.body.code).toMatch(/^RM-[A-Z0-9]{8}$/);
  });

  it('creates a code without amount', async () => {
    mockCreate.mockResolvedValueOnce({});
    const token = adminToken();
    const res = await request(app)
      .post('/api/payment-codes')
      .set('Authorization', 'Bearer ' + token)
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^RM-/);
  });
});

// --- POST /api/payment-codes/redeem ---------------------------------------

describe('POST /api/payment-codes/redeem', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns 400 when code is missing', async () => {
    const res = await request(app)
      .post('/api/payment-codes/redeem')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for invalid code', async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/payment-codes/redeem')
      .send({ code: 'RM-INVALID1' });
    expect(res.status).toBe(404);
  });

  it('returns 409 for already used code', async () => {
    mockFindOne.mockResolvedValueOnce({ code: 'RM-USED1234', used: true });
    const res = await request(app)
      .post('/api/payment-codes/redeem')
      .send({ code: 'RM-USED1234' });
    expect(res.status).toBe(409);
  });

  it('redeems a valid code', async () => {
    const mockCode = {
      code: 'RM-VALID123',
      used: false,
      amount: 5000,
      currency: 'NGN',
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindOne.mockResolvedValueOnce(mockCode);
    const res = await request(app)
      .post('/api/payment-codes/redeem')
      .send({ code: 'RM-VALID123', sessionId: 'sess-abc' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.amount).toBe(5000);
    expect(mockCode.used).toBe(true);
    expect(mockCode.usedBy).toBe('sess-abc');
    expect(mockCode.save).toHaveBeenCalled();
  });

  it('uppercases the code before lookup', async () => {
    mockFindOne.mockResolvedValueOnce(null);
    await request(app)
      .post('/api/payment-codes/redeem')
      .send({ code: 'rm-lower123' });
    expect(mockFindOne).toHaveBeenCalledWith({ code: 'RM-LOWER123' });
  });
});

// --- POST /api/applications (submission) ----------------------------------

describe('POST /api/applications', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates an application with form fields', async () => {
    mockSave.mockResolvedValueOnce(undefined);
    const res = await request(app)
      .post('/api/applications')
      .field('fullName', 'Test User')
      .field('email', 'test@example.com')
      .field('phone', '+1234567890')
      .field('instagram', '@testuser')
      .field('heightCm', '175')
      .field('waistCm', '68')
      .field('shoeSizeEU', '42')
      .field('eyeColor', 'blue')
      .field('sessionId', 'sess-test-1');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});

// --- Auth middleware edge cases --------------------------------------------

describe('requireAdmin middleware', () => {
  it('rejects tokens with non-admin role', async () => {
    const token = jwt.sign(
      { sub: 'user-1', email: 'user@test.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(403);
  });

  it('rejects expired tokens', async () => {
    const token = jwt.sign(
      { sub: 'admin-1', email: 'a@b.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );
    // Small delay to ensure expiry
    await new Promise((r) => setTimeout(r, 50));
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(401);
  });
});

// --- CORS -----------------------------------------------------------------

describe('CORS headers', () => {
  it('includes Access-Control-Allow-Origin', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});

// Prevent Jest from hanging due to the mongoose.connect().then(app.listen) chain
afterAll(() => {
  jest.restoreAllMocks();
});
