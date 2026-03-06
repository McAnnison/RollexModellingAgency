/* eslint-disable no-console */
/*
  Create or update an admin user in MongoDB.

  Usage:
    node tools/create-admin.js --email admin@example.com --password yourpassword

  Environment:
    MONGODB_URI  (defaults to mongodb://127.0.0.1:27017/rollex)
*/

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}

async function main() {
  const email = getArgValue('--email');
  const password = getArgValue('--password');

  if (!email || !password) {
    console.error('Usage: node tools/create-admin.js --email <email> --password <password>');
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rollex';

  const adminUserSchema = new mongoose.Schema(
    {
      email: { type: String, unique: true, lowercase: true },
      passwordHash: String,
    },
    { timestamps: true }
  );
  const AdminUser = mongoose.model('AdminUser', adminUserSchema);

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await AdminUser.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), passwordHash },
    { upsert: true, new: true }
  );

  console.log('Admin user created/updated:', result.email);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
