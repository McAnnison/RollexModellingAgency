/* eslint-disable no-console */
const admin = require('firebase-admin');

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    if (index === -1 || index + 1 >= process.argv.length) return null;
    return process.argv[index + 1];
}

async function main() {
    const uid = getArgValue('--uid');
    const email = getArgValue('--email');

    if (!uid && !email) {
        console.error('Provide --uid or --email');
        process.exit(1);
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });

    let userRecord = null;
    if (uid) {
        userRecord = await admin.auth().getUser(uid);
    } else {
        userRecord = await admin.auth().getUserByEmail(email);
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });

    console.log(`Admin claim set for ${userRecord.email || userRecord.uid}`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
