import * as express from 'express';
import { userSchema } from "../model/UserModel";
import bycrypt from 'bcryptjs'
import jwt from "jsonwebtoken";
import * as validator from 'express-validator';
import firebase from 'firebase'
import admin from "firebase-admin";
import cookie from "cookie"

export class Logout {
    router = express.Router();

    constructor() {
        this.init();
    }

    init() {
        this.router.post('/logout', (request: express.Request, response: express.Response) => {
            firebase.auth().signOut();
        });
    }
}