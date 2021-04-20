import * as functions from 'firebase-functions';
import express from 'express';
import bodyParser from "body-parser";
import cookieParser from "cookie-parser"
import { Route } from './router/route'
import { db } from './connector/configFireBase'
import notification from './controller/NotificationManagement'
import Schedule from './schedule/schedule'
import * as dgram from 'dgram'
import { mediaServer } from './media-server/media'
import * as posenet from '@tensorflow-models/posenet'

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true }, (buffer, sender) => {
    const message = buffer.toString();
    console.log({
        kind: "UDP_MESSAGE",
        message,
        sender
    });

    socket.send(message.toUpperCase(), sender.port, sender.address, error => {
        if (error) {
            console.error(error);
        } else {
            console.log({
                kind: "RESPOND",
                message: message.toUpperCase(),
                sender
            });
            socket.send("Respond", sender.port, sender.address, err => {
                console.log(err ? err : "Sended");
                // socket.close();
            });
        }
    });
});


socket.on('listening', () => {
    const address = socket.address();
    console.log(`server listening ${address.address}:${address.port}`);
});

const app = express();

db.ref('.info/connected').on('value', async (snap) => {
    if (snap.val() === true) {
        console.log("connected");
        const routes = new Route(app);
        routes.routers();
        const s: Schedule = new Schedule();
        notification.receiveMessage();
        let media: mediaServer;
        while (true) {
            try {
                console.log("Waiting....");
                const net = await posenet.load({
                    architecture: "MobileNetV1",
                    outputStride: 16,
                    multiplier: 0.75,
                    quantBytes: 2,
                    inputResolution: { width: 640, height: 480 }
                });
                console.log("loaded");
                media = new mediaServer(net);
                media.dectectMedia();
                break;
            } catch (error) {
                console.log(error);
            }
        }
    } else {
        console.log("not connected");
    }
});

app.use(cookieParser());

app.use(bodyParser.json());

app.use((req, res, next) => {

    // Website you wish to allow to connect
    const allowOrigin = ['https://learning-5071c.web.app', 'http://localhost:3000'];
    const origin = req.headers.origin;
    if (allowOrigin.includes(origin as string)) {
        // res.setHeader('Access-Control-Allow-Origin', 'https://learning-5071c.web.app');
        res.setHeader('Access-Control-Allow-Origin', origin as string);
    }
    // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

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

process.on('SIGHUP', function () {
    process.exit();
});

process.on('SIGINT', function (code) {
    console.log("CTRL + C");
    process.exit();
});

process.on('exit', function (code) {
    console.log("Exit");
});

app.listen(5000);
socket.bind(5000);
exports.app = functions.https.onRequest(app);