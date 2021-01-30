import * as functions from 'firebase-functions';
import admin from "firebase-admin";
import * as firebase from 'firebase'

const adminstrator = admin.initializeApp({
    credential: admin.credential.cert({
        privateKey: functions.config().service.private_key.replace(/\\n/g, '\n'),
        projectId: functions.config().service.project_id,
        clientEmail: functions.config().service.client_email,
    }),
    databaseURL: functions.config().service.database_url,
});

const firebaseConfig = {
    apiKey: functions.config().client.api_key,
    authDomain: functions.config().client.auth_domain,
    databaseURL: functions.config().client.database_url,
    projectId: functions.config().client.project_id,
    storageBucket: functions.config().client.storage_bucket,
    messagingSenderId: functions.config().client.messaging_sender_id,
    appId: functions.config().client.app_id
};

const client = firebase.default.initializeApp(firebaseConfig);
const adminAuth = adminstrator.auth();
const db = admin.database();
const messaging = admin.messaging();
db.goOnline();
console.log("connected");
export { adminAuth, adminstrator, db, client, messaging }