/*
  Firebase Cloud Functions scaffold:
  - Sends admin notification email when a new application is created
  - Sends applicant confirmation email

  Setup (Firebase CLI):
  1) firebase init functions
  2) Replace functions/index.js with this file (or merge)
  3) cd functions && npm i
  4) Set env vars:
     firebase functions:config:set sendgrid.key="YOUR_SENDGRID_KEY" email.admin="admin@example.com" email.from="no-reply@yourdomain.com"
  5) firebase deploy --only functions
*/

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

function mustGetConfig(path, fallback = null) {
  const cfg = functions.config();
  const parts = path.split('.');
  let cur = cfg;
  for (const p of parts) {
    cur = cur?.[p];
  }
  if (!cur) {
    if (fallback !== null) return fallback;
    throw new Error(`Missing functions config: ${path}`);
  }
  return cur;
}

exports.onApplicationCreated = functions.firestore
  .document('applications/{applicationId}')
  .onCreate(async (snap, context) => {
    const data = snap.data() || {};

    // Basic validation
    const applicantEmail = String(data.email || '').trim();
    const applicantName = String(data.fullName || '').trim();

    const sendgridKey = mustGetConfig('sendgrid.key');
    const adminEmail = mustGetConfig('email.admin');
    const fromEmail = mustGetConfig('email.from');

    sgMail.setApiKey(sendgridKey);

    const appId = context.params.applicationId;

    // 1) Admin notification
    await sgMail.send({
      to: adminEmail,
      from: fromEmail,
      subject: `New registration: ${applicantName || 'Applicant'} (${appId})`,
      text:
        `A new student registered.\n\n` +
        `Name: ${applicantName || '(not provided)'}\n` +
        `Email: ${applicantEmail || '(not provided)'}\n` +
        `Phone: ${data.phone || '(not provided)'}\n` +
        `Instagram: ${data.instagram || '(not provided)'}\n` +
        `Application ID: ${appId}\n\n` +
        `View in Firebase Console → Firestore → applications/${appId}`,
    });

    // 2) Applicant confirmation
    if (applicantEmail) {
      await sgMail.send({
        to: applicantEmail,
        from: fromEmail,
        subject: 'We received your registration',
        text:
          `Hi ${applicantName || 'there'},\n\n` +
          `Thanks for registering — we’ve received your submission.\n` +
          `Your reference ID is: ${appId}.\n\n` +
          `We’ll contact you with next steps.\n\n` +
          `Model Academy`,
      });
    }

    return null;
  });
