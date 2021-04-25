import express from 'express';
import { Login } from '../controller/Login'
import { Logout } from '../controller/Logout'
import auth from '../controller/Authenticate';
import CalendarController from '../controller/CalenderController'
import { UserController } from '../controller/UserController';
import { BookRoomController } from '../controller/BookRoomController'
import { RoomController } from '../controller/RoomController'
import {ReportErrorController} from '../controller/ReportErrorController'
import {RequestListController} from '../controller/RequestListController'
import {ChangeRoomController} from '../controller/ChangeRoomController'
import {ReportController} from '../controller/ReportController'
import {NotifyController} from '../controller/NotifyController'

export class Route {
    app: express.Application;

    userController = new UserController();
    calendarController = new CalendarController();
    bookRoomController = new BookRoomController();
    roomController = new RoomController();
    login = new Login();
    logout = new Logout();
    ReportErrorController = new ReportErrorController();
    RequestListController = new RequestListController();
    ChangeRoomController = new ChangeRoomController();
    ReportController = new ReportController();
    NotifyController = new NotifyController();

    constructor(app: express.Application) {
        this.app = app;
    }

    routers() {
        this.app.get('/', auth, (req, res) => {
            res.json({role: res.locals.role});
        });
        this.app.use('/', this.logout.router);
        this.app.use('/', this.userController.router);
        this.app.use('/', this.calendarController.router);
        this.app.use('/', this.bookRoomController.router);
        this.app.use('/', this.roomController.router);
        this.app.use('/', this.login.router);
        this.app.use('/', this.ReportErrorController.router);
        this.app.use('/', this.RequestListController.router);
        this.app.use('/', this.ChangeRoomController.router);
        this.app.use('/', this.ReportController.router);
        this.app.use('/', this.NotifyController.router);
    }
}