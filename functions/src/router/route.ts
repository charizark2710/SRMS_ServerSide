import express from 'express';
import { UserController } from '../controller/UserController';
import { Login } from '../controller/Login'
import { Logout } from '../controller/Logout'
import CalendarController from '../controller/CalenderController'
import auth from '../controller/Authenticate';

export class Route {
    app: express.Application;

    userController = new UserController();
    calendarController = new CalendarController();
    login = new Login();
    logout = new Logout();
    constructor(app: express.Application) {
        this.app = app;
    }

    routers() {
        this.app.get('/', auth, (req, res) => {
            res.send('ok');
        });
        this.app.use('/', this.userController.router);
        this.app.use('/', this.calendarController.router);
        this.app.use('/', this.login.router);
        this.app.use('/', this.logout.router);
    }
}