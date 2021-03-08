import { userSchema } from '../model/UserModel'
import * as express from 'express';
import { adminAuth } from "../connector/configFireBase"
import bycrypt from 'bcryptjs'
import auth from './Authenticate';
import authorized from './Authorized';
import notification from './NotificationManagement'

export class UserController {
    public router = express.Router();
    path = '/users'
    constructor() {
        this.init();
    }

    init() {
        this.router.patch(this.path + "/edit/:id", auth, authorized({ hasRole: ['admin'] }), this.editUser);
        this.router.delete(this.path + "/delete/:id", auth, authorized({ hasRole: ['admin'] }), this.deleteUser);
        this.router.patch(this.path + "/banned/:id/restore", auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.restoreUser);
        this.router.get(this.path + '/:id', auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.getUser);
    }

    editUser = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const salt = await bycrypt.genSalt(10);
            const password = await bycrypt.hash(data.password, salt);
            const user = await adminAuth.updateUser(request.params.id, {
                password: password
            });
            // await userSchema.doc(request.params.id).update({
            //     password: password,
            // });
            return response.send(user);
        } catch (error) {
            response.status(500).send(error);
        }
    }

    deleteUser = async (request: express.Request, response: express.Response) => {
        try {
            const uid = request.params.id;
            const user = await adminAuth.deleteUser(uid);
            // userSchema.doc(uid).update({
            //     banned: true,
            //     bannedAt: new Date()
            // }).catch(error => {
            //     response.status(500).send(error);
            // });
            userSchema.orderByChild("uid").equalTo(uid).get().then(snapshot => {
                snapshot.ref.update({
                    banned: true,
                    bannedAt: new Date()
                });
            });
            response.send(user);
        } catch (error) {
            response.status(500).send(error);
        }
    }

    restoreUser = async (request: express.Request, response: express.Response) => {
        try {
            const uid = request.params.id;
            const user = await userSchema.child(uid).get();
            const data = await user.val();
            // const user = await userSchema.doc(uid).get();
            // const data = user.data();
            if (user.exists() && data?.banned) {
                // await userSchema.doc(uid).update({
                //     banned: false,
                //     bannedAt: null
                // });
                user.ref.update({
                    banned: false,
                    bannedAt: null
                });
                const userRecord = await adminAuth.createUser({
                    uid: uid,
                    email: data.email,
                    displayName: data.name,
                });
                await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'client' });
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
            // const user = await userSchema.doc(uid).get();
            const user = await userSchema.child(uid).get();
            notification.sendMessage({
                message: "You view Yourself",
                receiver: user.val().uid,
                sender: 'admin',
                sendAt: (new Date()).toString(),
                isRead: false
            })
            response.json(user.val());
        } catch (error) {
            console.log(error);
            response.status(500).json(error);
        }
    }
}
