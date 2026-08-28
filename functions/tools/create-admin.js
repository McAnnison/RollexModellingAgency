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
const { getArgValue } = require('../shared/cli-utils');
const { getAdminUserModel } = require('../shared/models');

async function main() {
  const email = getArgValue('--email');
  const password = getArgValue('--password');

  if (!email || !password) {
    console.error('Usage: node tools/create-admin.js --email <email> --password <password>');
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rollex';
  const AdminUser = getAdminUserModel();

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
