import express from 'express';
import { UserController } from '../controller/UserController';
import { Login } from '../controller/Login'
import auth from '../controller/Authenticate';
import authorized from '../controller/Authorized';

export class Route {
    app: express.Application;

    userController = new UserController();
    login = new Login();

    constructor(app: express.Application) {
        this.app = app;
    }

    routers() {
        this.app.get('/', auth, (req, res) => {
            res.send('ok');
        });
        this.app.use('/', this.userController.router);
        this.app.use('/', this.login.router);
    }
}