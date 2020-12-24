import config from "../../res/config.json";

import admin = require("firebase-admin");
import * as firebase from 'firebase'

const adminstrator = admin.initializeApp({
    credential: admin.credential.cert({
        privateKey: config.private_key,
        projectId: config.project_id,
        clientEmail: config.client_email
    }),
    databaseURL: config.databaseUrl
});

const client = firebase.default.initializeApp({
    credential: admin.credential.cert({
        privateKey: config.private_key,
        projectId: config.project_id,
        clientEmail: config.client_email
    }),
    databaseURL: config.databaseUrl
});

const db = admin.firestore();
console.log("connected");
export { adminstrator, client, db }









