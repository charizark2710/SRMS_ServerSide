import * as express from 'express';
import { userSchema } from "../model/UserModel";
import bycrypt from 'bcryptjs'
import * as validator from 'express-validator';
import admin = require("firebase-admin");
import cookie from "cookie"
import jwt from "jsonwebtoken";
import { UserController } from './UserController'

export class Login {
    router = express.Router();
    url = "/login";
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.url, this.login);
    }

    login = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const decodedToken = await admin.auth().verifyIdToken(data.idToken);
            const email = decodedToken.email;
            const query = await userSchema.where('deleted', '==', false).where('email', '==', email).get();
            if (!query.empty) {
                // const checkPassword = await bycrypt.compare(data.password, query.docs[0].data().password);
                // if (checkPassword) {
                const user = await admin.auth().getUser(decodedToken.uid);
                const token = 'Bearer ' + jwt.sign({ uid: user.uid, role: user.customClaims?.role, email: user.email }, 'weeb');
                console.log(token);
                response.setHeader('Set-Cookie', cookie.serialize('token', token, {
                    maxAge: 60 * 60,
                    httpOnly: true
                }));
                response.json({ message: 'ok' });
                // } else {
                //     response.send('Sai mat khau');
                // }
            } else {
                request.body = { email: email, uid: data.uid, name: data.name };
                const controller = new UserController()
                controller.addUser(request, response);
            }
        } catch (e) {
            console.log(e);
            response.status(500).send(e);
        }
    }
}

