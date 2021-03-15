import * as functions from 'firebase-functions';
import admin from "firebase-admin";

const adminstrator = admin.initializeApp({
    credential: admin.credential.cert({
        privateKey: functions.config().service.private_key.replace(/\\n/g, '\n'),
        projectId: functions.config().service.project_id,
        clientEmail: functions.config().service.client_email,
    }),
    databaseURL: functions.config().service.database_url,
});

const adminAuth = adminstrator.auth();
const db = admin.database();
const messaging = admin.messaging();
db.goOnline();
console.log("connected");
export { adminAuth, adminstrator, db, messaging }