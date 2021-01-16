import * as functions from 'firebase-functions';
import express = require('express');
import bodyParser = require("body-parser");
import cookieParser = require("cookie-parser")
import { Route } from './router/route'

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

const routes = new Route(app);
routes.routers();
exports.app = functions.https.onRequest(app);