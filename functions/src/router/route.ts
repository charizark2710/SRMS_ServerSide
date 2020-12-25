import express = require('express');
import { UserController } from '../controller/UserController'
const URL = require('url').URL;
export class Route {
    app: express.Application;

    userController = new UserController();
    constructor(app: express.Application) {
        this.app = app;
    }

    routers() {
        this.app.use('/', this.userController.router);
    }
}