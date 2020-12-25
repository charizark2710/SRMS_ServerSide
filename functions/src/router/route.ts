import express = require('express');
import { UserController } from '../controller/UserController'
const URL = require('url').URL;
export class Route {
    url = "/quickstart-1594476482074/us-central1/app/";
    app: express.Application;

    userController = new UserController();
    constructor(app: express.Application) {
        this.app = app;
    }

    routers() {
        this.app.use(this.url, this.userController.router);
    }
}