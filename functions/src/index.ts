import * as functions from 'firebase-functions';
import express from 'express';
import bodyParser from "body-parser";
import cookieParser from "cookie-parser"
import { Route } from './router/route'
import { mediaServer } from './media-server/media'
import * as posenet from '@tensorflow-models/posenet'
import { db } from './connector/configFireBase'
import notification from './controller/NotificationManagement'
import Schedule from './schedule/schedule'

const app = express();

let media: mediaServer;
posenet.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2,
    inputResolution: { width: 640, height: 480 }
}).then(async net => {
    media = new mediaServer(net);
    media.dectectMedia();
});

app.use(cookieParser());

app.use(bodyParser.json());
app.set('view engine', 'html');

app.use((req, res, next) => {

    // Website you wish to allow to connect
    // res.setHeader('Access-Control-Allow-Origin', 'https://learning-5071c.web.app');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', "true");

    // Pass to next layer of middleware
    next();
});

const s: Schedule = new Schedule();

notification.receiveMessage();

const routes = new Route(app);
routes.routers();

process.on('SIGHUP', function () {
    db.goOffline();
    process.exit();
});

process.on('SIGINT', function (code) {
    db.ref('video').set({
        isDone: true,
        frame: ""
    });
    console.log("CTRL + C");
    process.exit();
});

process.on('exit', function (code) {
    db.goOffline();
    console.log("Exit");
});

app.listen(5000);
exports.app = functions.https.onRequest(app);