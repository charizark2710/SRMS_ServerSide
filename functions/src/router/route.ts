import express from 'express';
import { Login } from '../controller/Login'
import { Logout } from '../controller/Logout'
import auth from '../controller/Authenticate';
import CalendarController from '../controller/CalenderController'
import { UserController } from '../controller/UserController';
import { BookRoomController } from '../controller/BookRoomController'
import { RoomController } from '../controller/RoomController'

export class Route {
    app: express.Application;

    userController = new UserController();
    calendarController = new CalendarController();
    bookRoomController = new BookRoomController();
    roomController = new RoomController();
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
        this.app.use('/', this.bookRoomController.router);
        this.app.use('/', this.roomController.router);
        this.app.use('/', this.login.router);
        this.app.use('/', this.logout.router);
    }
}