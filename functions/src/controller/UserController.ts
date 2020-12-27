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
        this.router.post(this.path + ('/signUp'), this.validate(), this.addUser);
        this.router.get(this.path + '/test', (req, res) => {
            res.send('ok');
        })
    }

    validate = () => {
        return [
            validator.body('name').trim().escape().not().isEmpty().withMessage('User cannot empty').
                bail().isLength({ min: 3 }).bail(),
            validator.body('email').isEmail().
                trim().normalizeEmail().
                not().
                isEmpty().
                withMessage('Invalid email address!').bail().withMessage("Invalid email"),
            validator.body('password')
                .not()
                .isEmpty()
                .withMessage('Password cannot be empty')
                .isLength({ min: 6 })
                .withMessage('Password must be more that 6 charecters').bail()]
    }

    addUser = async (request: express.Request, response: express.Response) => {
        try {
            const errors = validator.validationResult(request);
            if (!errors.isEmpty()) {
                return response.status(400).json({ errors: errors.array() });
            }
            const data = request.body;
            const salt = await bycrypt.genSalt(10);
            const password = await bycrypt.hash(data.password, salt);
            const name = data.name;
            const email = data.email;
            let isEmailExist = await userSchema.where('email', "==", email).get();

            if (isEmailExist.empty) {
                admin.app().auth().createUser({
                    email: data.email,
                    password: password,
                    displayName: data.name
                }).then(async userRecord => {
                    userSchema.doc().create({
                        email: userRecord.email!,
                        password: password,
                        name: userRecord.displayName!,
                    });
                    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'client' });
                    response.send(userRecord);
                });
            }
            else {
                response.send("This email have been used");
                // response.redirect("Trang trủ");
            }
        }
        catch (error) {
            console.error(error);
            response.status(500).send("Something went wrong");
        }
    };
}
