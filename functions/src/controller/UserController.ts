import { userSchema } from '../model/UserModel'
import * as express from 'express';
import admin = require("firebase-admin");
import bycrypt from 'bcryptjs'
import * as validator from 'express-validator';
import auth from './Authenticate';
import authorized from './Authorized'

export class UserController {
    public router = express.Router();
    path = '/users'
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.path + '/signUp', this.validate(), this.addUser);
        this.router.patch(this.path + "/edit/:id", this.editUser);
        this.router.delete(this.path + "/delete/:id", this.deleteUser);
        this.router.patch(this.path + "/deleted/:id/restore", this.restoreUser);
        this.router.get(this.path + '/:id', auth, authorized({ hasRole: ['client'] }), this.getUser);
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
            const email: string = data.email;
            const name = email.split('@')[0];
            const isEmailExist = await userSchema.where('email', "==", email).get();

            if (isEmailExist.empty) {
                admin.app().auth().createUser({
                    email: email,
                    password: password,
                    displayName: name
                }).then(async userRecord => {
                    userSchema.doc(userRecord.uid).set({
                        email: userRecord.email!,
                        password: password,
                        name: userRecord.displayName!,
                        deleted: false,
                        deletedAt: undefined
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
    }

    editUser = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const salt = await bycrypt.genSalt(10);
            const password = await bycrypt.hash(data.password, salt);
            const user = await admin.auth().updateUser(request.params.id, {
                password: password
            });
            await userSchema.doc(request.params.id).update({
                password: password,
            });
            return response.send(user);
        } catch (error) {
            response.status(500).send(error);
        }
    }

    deleteUser = async (request: express.Request, response: express.Response) => {
        try {
            const uid = request.params.id;
            const user = await admin.auth().deleteUser(uid);
            userSchema.doc(uid).update({
                deleted: true,
                deletedAt: new Date()
            }).catch(error => {
                response.status(500).send(error);
            });
            response.send(user);
        } catch (error) {
            response.status(500).send(error);
        }
    }

    restoreUser = async (request: express.Request, response: express.Response) => {
        try {
            const uid = request.params.id;
            const user = await userSchema.doc(uid).get();
            const data = user.data();
            if (user.exists && data?.deleted) {
                await userSchema.doc(uid).update({
                    deleted: false,
                    deletedAt: null
                });
                const userRecord = await admin.auth().createUser({
                    uid: uid,
                    email: data.email,
                    displayName: data.name,
                    password: data.password,
                });
                await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'client' });
                return response.send(userRecord);
            }
            response.send("Nguoi dung khong ton tai");
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }

    getUser = async (request: express.Request, response: express.Response) => {
        try {
            const uid = request.params.id;
            const user = await userSchema.doc(uid).get();
            response.send(user.data());
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }
}
