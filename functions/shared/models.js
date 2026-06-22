'use strict';

const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

function getAdminUserModel() {
  return mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);
}

module.exports = { adminUserSchema, getAdminUserModel };
