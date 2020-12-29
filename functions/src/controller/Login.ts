import * as express from 'express';
import { userSchema } from "../model/UserModel";
import bycrypt from 'bcryptjs'
import * as validator from 'express-validator';
import admin = require("firebase-admin");
import cookie from "cookie"
import jwt from "jsonwebtoken";

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
        this.router.post(this.url, this.validate(), this.login);
    }

    login = async (request: express.Request, response: express.Response) => {
        try {
            const errors = validator.validationResult(request);
            if (!errors.isEmpty()) {
                return response.status(400).json({ errors: errors.array() });
            }
            const data = request.body;
            const email = data.email;
            const query = await userSchema.where('deleted', '==', false).where('email', '==', email).get();
            if (!query.empty) {
                console.log(data.password);
                const checkPassword = await bycrypt.compare(data.password, query.docs[0].data().password);
                if (checkPassword) {
                    const user = await admin.auth().getUserByEmail(email);
                    const token = 'Bearer ' + jwt.sign({ uid: user.uid, role: user.customClaims?.role, email: user.email }, 'weeb');
                    console.log(token);
                    response.setHeader('Set-Cookie', cookie.serialize('token', token, {
                        maxAge: 60 * 60,
                        httpOnly: true
                    }));
                    response.send('ok');
                } else {
                    response.send('Sai mat khau');
                }
            } else {
                response.send('Sai email');
            }
        } catch (e) {
            console.log(e);
            response.status(500).send(e);
        }
    }
}

