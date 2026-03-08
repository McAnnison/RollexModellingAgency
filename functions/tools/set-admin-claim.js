/* eslint-disable no-console */
// This script sets an admin claim for a user in MongoDB.
// Usage: node tools/set-admin-claim.js --email user@example.com

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    if (index === -1 || index + 1 >= process.argv.length) return null;
    return process.argv[index + 1];
}

async function main() {
    const email = getArgValue('--email');
    if (!email) {
        console.error('Provide --email');
        process.exit(1);
    }

    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rollex';
    const adminUserSchema = new mongoose.Schema(
        {
            email: { type: String, unique: true, lowercase: true },
            passwordHash: String,
            isAdmin: { type: Boolean, default: false },
        },
        { timestamps: true }
    );
    const AdminUser = mongoose.model('AdminUser', adminUserSchema);

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
