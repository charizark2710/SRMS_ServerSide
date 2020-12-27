import express = require('express');
import { UserController } from '../controller/UserController';
import { Login } from '../controller/Login'
export class Route {
    app: express.Application;

    userController = new UserController();
    login = new Login();
    constructor(app: express.Application) {
        this.app = app;
    }

    routers() {
        this.app.use('/', this.userController.router);
        this.app.use('/', this.login.router);
    }
}