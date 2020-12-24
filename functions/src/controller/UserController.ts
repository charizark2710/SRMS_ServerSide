import { userSchema } from '../model/UserModel'
import * as express from 'express';
import admin = require("firebase-admin");
import bycrypt from 'bcryptjs'
import jwt from "jsonwebtoken";
import * as validator from 'express-validator';

export class UserController {
    public router = express.Router();
    path = '/users'
    constructor() {
        this.init();
    }

    init() {
        console.log(this.path + "/test");
        this.router.post(this.path + ('/signUp'), this.addUser);
        this.router.get(this.path + "/test", (req, res) => {
            res.send('ok');
        })
    }

    addUser = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const salt = await bycrypt.genSalt(10);
            const password = await bycrypt.hash(data.password, salt);
            admin.app().auth().createUser({
                email: data.email,
                password: password,
                displayName: data.name
            });

            userSchema.create({
                email: data.email,
                password: password,
                name: data.name
            });

        } catch (error) {
            console.error(error);
        }

    };
}
