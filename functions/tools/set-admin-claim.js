/* eslint-disable no-console */
// This script sets an admin claim for a user in MongoDB.
// Usage: node tools/set-admin-claim.js --email user@example.com

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { getArgValue } = require('../shared/cli-utils');
const { getAdminUserModel } = require('../shared/models');

async function main() {
    const email = getArgValue('--email');
    if (!email) {
        console.error('Provide --email');
        process.exit(1);
    }

    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rollex';
    const AdminUser = getAdminUserModel();

    await mongoose.connect(MONGODB_URI);
    const user = await AdminUser.findOneAndUpdate(
        { email: email.toLowerCase() },
        { isAdmin: true },
        { new: true }
    );
    if (!user) {
        console.error('User not found:', email);
        process.exit(1);
    }
    console.log(`Admin claim set for ${user.email}`);
    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
