import * as functions from 'firebase-functions';
import express = require('express');
import bodyParser = require("body-parser");
import * as connector from './connector/dtbHelper'
import { Route } from './router/route'

const app = express();

app.use(bodyParser.json());
app.set('json spaces', 5)

app.listen(5000, () => {
    console.log(`Example app listening at http://localhost:5000`)
});


exports.app = functions.https.onRequest(app);

const routes = new Route(app);
routes.routers();

