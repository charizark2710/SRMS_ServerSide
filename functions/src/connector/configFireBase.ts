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
db.goOnline();
db.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
        console.log("connected");
    } else {
        console.log("not connected");
    }
});
export { adminAuth, adminstrator, db }