import * as functions from 'firebase-functions';
import admin = require("firebase-admin");
import * as firebase from 'firebase'

const data = JSON.parse(process.env.FIREBASE_CONFIG!);
const adminstrator = admin.initializeApp({
    credential: admin.credential.cert({
        privateKey: functions.config().service.private_key,
        projectId: functions.config().service.project_id,
        clientEmail: functions.config().service.client_email
    }),
    databaseURL: functions.config().service.databaseuRL
});

// const client = firebase.default.initializeApp({
//     credential: admin.credential.cert({
//         privateKey: config.private_key,
//         projectId: config.project_id,
//         clientEmail: config.client_email
//     }),
//     databaseURL: config.databaseUrl
// });

const db = admin.firestore();
console.log("connected");
export { adminstrator, db }