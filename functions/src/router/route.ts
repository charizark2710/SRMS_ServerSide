import express = require('express');
import { UserController } from '../controller/UserController';
import { Login } from '../controller/Login'
import { testML } from '../TensorFlow/testML'
import { mediaServer } from '../media-server/media-server'
export class Route {
    app: express.Application;

    userController = new UserController();
    login = new Login();
    testML = new testML();
    media = new mediaServer();

    constructor(app: express.Application) {
        this.app = app;
    }

    routers() {
        this.app.use('/', this.userController.router);
        this.app.use('/', this.login.router);
        this.app.use('/', this.testML.router);
        this.app.use('/', this.media.router)
    }
}