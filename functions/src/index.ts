import * as functions from 'firebase-functions';
import express from 'express';
import bodyParser from "body-parser";
import cookieParser from "cookie-parser"
import { Route } from './router/route'
import { mediaServer } from './media-server/media'
import * as posenet from '@tensorflow-models/posenet'
import { Canvas, Image, createCanvas } from 'canvas'
import { db } from './connector/configFireBase'

const app = express();
app.use(cookieParser());

app.use(bodyParser.json());
app.set('view engine', 'html');

app.use((req, res, next) => {

    // Website you wish to allow to connect
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
let media: mediaServer;
posenet.load({
    architecture: "MobileNetV1",
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2,
    inputResolution: { width: 640, height: 480 }
}).then(async net => {
    media = new mediaServer(net);
    let check = (await db.ref('video/isDone').get()).val();
    media.dectectMedia(check);
});


const routes = new Route(app);
routes.routers();

exports.app = functions.https.onRequest(app);