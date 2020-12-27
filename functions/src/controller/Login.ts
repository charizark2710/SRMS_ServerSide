import * as express from 'express';
import { userSchema } from "../model/UserModel";
import bycrypt from 'bcryptjs'
import jwt from "jsonwebtoken";
import * as validator from 'express-validator';
import firebase from 'firebase'
import admin = require("firebase-admin");
import cookie from "cookie"

export class Login {
    router = express.Router();
    url = "/login";
    constructor() {
        this.init();
    }

    validate = () => {
        return [
            validator.body('email')
                .trim()
                .normalizeEmail()
                .not()
                .isEmpty()
                .withMessage('Invalid email address!')
                .bail(),
            validator.body('password')
                .not()
                .isEmpty()
                .withMessage('Password cannot be empty')
                .isLength({ min: 6 })
                .withMessage('Password must be more that 6 charecters').bail()]
    }

    init() {
        this.router.post(this.url, this.login);
    }

    login = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const provider = new firebase.auth.GoogleAuthProvider;
            // const errors = validator.validationResult(request);
            // if (!errors.isEmpty()) {
            //     return response.status(400).json({ errors: errors.array() });
            // }
            firebase.auth().signInWithPopup(provider).then(userCredential => {
                const token = (userCredential.credential as firebase.auth.OAuthCredential).accessToken;
                const user = userCredential.user;
                //Check if user is valid
                if (user?.email?.split('@').slice(1).join('.').trim() == "fpt.edu.vn") {
                    let cookies = cookie.serialize('Token', token!, {
                        httpOnly: true,
                        maxAge: 60 * 60
                    });
                    response.setHeader('Cookie', cookies);
                    response.send("Toi trang chu");
                } else {
                    response.send("Tra ve sign up");
                }
            }).catch(e => {
                console.log(e);
                response.status(500).send(e);
            });
        } catch (e) {
            console.log(e);
            response.status(500).send(e);
        }
    }
}

