import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

admin.initializeApp();

function mustGetConfig(path: string): string {
	const cfg = functions.config();
	const parts = path.split(".");
	let cur: any = cfg;
	for (const p of parts) {
		cur = cur?.[p];
	}
	if (!cur) {
		throw new Error(`Missing functions config: ${path}`);
	}
	return String(cur);
}

export const onApplicationCreated = functions.firestore
	.document("applications/{applicationId}")
	.onCreate(async (snap, context) => {
		const data = snap.data() || {};

		const applicantEmail = String(data.email || "").trim();
		const applicantName = String(data.fullName || "").trim();

		const sendgridKey = mustGetConfig("sendgrid.key");
		const adminEmail = mustGetConfig("email.admin");
		const fromEmail = mustGetConfig("email.from");

		sgMail.setApiKey(sendgridKey);

		const appId = context.params.applicationId;

		// 1) Admin notification
		await sgMail.send({
			to: adminEmail,
			from: fromEmail,
			subject: `New registration: ${applicantName || "Applicant"} (${appId})`,
			text:
				"A new student registered.\n\n" +
				`Name: ${applicantName || "(not provided)"}\n` +
				`Email: ${applicantEmail || "(not provided)"}\n` +
				`Phone: ${data.phone || "(not provided)"}\n` +
				`Instagram: ${data.instagram || "(not provided)"}\n` +
				`Application ID: ${appId}\n\n` +
				`View in Firebase Console → Firestore → applications/${appId}`,
		});

		// 2) Applicant confirmation
		if (applicantEmail) {
			await sgMail.send({
				to: applicantEmail,
				from: fromEmail,
				subject: "We received your registration",
				text:
					`Hi ${applicantName || "there"},\n\n` +
					"Thanks for registering — we’ve received your submission.\n" +
					`Your reference ID is: ${appId}.\n\n` +
					"We’ll contact you with next steps.\n\n" +
					"Rolex Modelling Agency",
			});
		}

		return null;
	});
