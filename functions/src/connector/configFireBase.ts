import * as functions from 'firebase-functions';
import admin = require("firebase-admin");
import * as firebase from 'firebase'


const adminstrator = admin.initializeApp({
    credential: admin.credential.cert({
        privateKey: functions.config().service.private_key.replace(/\\n/g, '\n'),
        projectId: process.env.GCLOUD_PROJECT,
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
console.log("connected");
export { adminAuth, adminstrator, db, client }