import * as express from 'express';
import admin from "firebase-admin";
import cookie from "cookie"

export class Logout {
    router = express.Router();

    constructor() {
        this.init();
    }

    init() {
        this.router.post('/logout', (request: express.Request, response: express.Response) => {
            response.setHeader('Set-Cookie', cookie.serialize('token', '', {
                expires: new Date()
            }));
             response.json("user logout");
        });
    }
}