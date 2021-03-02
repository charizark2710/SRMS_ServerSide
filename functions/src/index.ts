import * as functions from 'firebase-functions';
import express, { NextFunction } from 'express';
import bodyParser from "body-parser";
import cookieParser from "cookie-parser"
import { Route } from './router/route'
import { mediaServer } from './media-server/media'
import * as posenet from '@tensorflow-models/posenet'
import { db } from './connector/configFireBase'
import notification from './controller/NotificationManagement'
import Schedule from './schedule/schedule'
import * as http from 'http'
import * as ws from 'websocket'
const app = express();

const server = http.createServer((request, response) => {
    console.log((new Date()) + ' Received request for ' + request.url);
    // Website you wish to allow to connect
    // res.setHeader('Access-Control-Allow-Origin', 'https://booming-pride-283013.web.app');
    response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

    // Request methods you wish to allow
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    response.setHeader('Access-Control-Allow-Credentials', "true");

    // Pass to next layer of middleware
    response.end("My first server!");
});

server.listen(9001, () => {
    console.log((new Date()) + ' Server is listening on port 9001');
});

const wsServer: ws.server = new ws.server({ httpServer: server, autoAcceptConnections: false });

wsServer.on('request', function (request) {
    var connection = request.accept(undefined, request.origin);
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData?.length + ' bytes');
            connection.sendBytes(message.binaryData as Buffer);
        }
    });
    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

app.use(cookieParser());

app.use(bodyParser.json());
app.set('view engine', 'html');

app.use((req, res, next) => {

    // Website you wish to allow to connect
    // res.setHeader('Access-Control-Allow-Origin', 'https://booming-pride-283013.web.app');
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

notification.receiveMessage();

const routes = new Route(app);
routes.routers();

process.on('SIGHUP', function () {
    db.ref('video').set({
        isDone: true,
        frame: ""
    });
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