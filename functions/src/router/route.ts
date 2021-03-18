import express from 'express';
import { UserController } from '../controller/UserController';
import { Login } from '../controller/Login'
import { Logout } from '../controller/Logout'
import auth from '../controller/Authenticate';
import authorized from '../controller/Authorized';
import { RoomController } from '../controller/RoomController';
import { BookRoom } from '../controller/BookRoom';
import { ReportErrorController } from '../controller/ReportErrorController';
import { BannedUserController } from '../controller/BannedUserController';

export class Route {
    app: express.Application;

    userController = new UserController();
    login = new Login();
    logout = new Logout();
    room = new RoomController();
    bookRoom = new BookRoom();
    reportError = new ReportErrorController();
    bannedUser = new BannedUserController();
    constructor(app: express.Application) {
        this.app = app;
    }

    routers() {
        this.app.get('/', auth, (req, res) => {
            res.send('ok');
        });
        this.app.use('/', this.userController.router);
        this.app.use('/', this.login.router);
        this.app.use('/', this.logout.router);
        //device control
        this.app.use('/', this.room.router);
        //book room
        this.app.use('/', this.bookRoom.router);
        //report error
        this.app.use('/', this.reportError.router)
        //banned list
        this.app.use('/', this.bannedUser.router)


    }
}