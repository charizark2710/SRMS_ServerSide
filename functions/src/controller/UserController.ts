import { userSchema } from '../model/UserModel'
import * as express from 'express';
import { adminAuth } from "../connector/configFireBase"
import bycrypt from 'bcryptjs'
import * as validator from 'express-validator';
import auth from './Authenticate';
import authorized from './Authorized';
import cookie from "cookie";
import jwt from "jsonwebtoken"
import notification from './NotificationManagement'

export class UserController {
    public router = express.Router();
    path = '/users'
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.path + '/signUp', this.validate(), this.addUser);
        this.router.patch(this.path + "/edit/:id", auth, authorized({ hasRole: ['admin'] }), this.editUser);
        this.router.delete(this.path + "/delete/:id", auth, authorized({ hasRole: ['admin'] }), this.deleteUser);
        this.router.patch(this.path + "/deleted/:id/restore", auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.restoreUser);
        this.router.get(this.path + '/:id', auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.getUser);
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
            const email: string = data.email;
            console.log(data);
            const eType = email.split('@')[1];
            if (eType === 'fpt.edu.vn' || eType === 'fe.edu.vn') {
                const isEmailExist = await userSchema.child("email").equalTo(email).get();
                // const isEmailExist = await userSchema.where('email', "==", email).get();

                if (!isEmailExist.exists()) {
                    // userSchema.doc(userRecord.uid).set({
                    //     email: userRecord.email!,
                    //     name: userRecord.displayName!,
                    //     deleted: false,
                    //     deletedAt: undefined
                    // });
                    let result;
                    if (eType === 'fpt.edu.vn') {
                        const idNum = data.email?.match('/[a-zA-Z]+|[0-9]+(?:\.[0-9]+)?|\.[0-9]+/g')?.toString();
                        if (idNum?.length! >= 4) {
                            await adminAuth.setCustomUserClaims(data.uid, { role: 'student' });
                            result = userSchema.child(data.employeeId).set({
                                email: data.email!,
                                name: data.name!,
                                deleted: false,
                                uid: data.uid!,
                                deletedAt: null
                            });
                        } else {
                            await adminAuth.setCustomUserClaims(data.uid, { role: 'lecture' });
                            result = userSchema.child(data.employeeId).set({
                                email: data.email!,
                                name: data.name!,
                                uid: data.uid!,
                                deleted: false,
                                deletedAt: null
                            });
                        }
                    } else {
                        await adminAuth.setCustomUserClaims(data.uid, { role: 'admin' });
                        result = userSchema.child(data.employeeId).set({
                            email: data.email!,
                            name: data.name!,
                            uid: data.uid!,
                            deleted: false,
                            deletedAt: null
                        });
                    }
                    const role = (await adminAuth.getUser(data.uid)).customClaims?.role;
                    const token = 'Bearer ' + jwt.sign({ uid: data.uid, employeeId: data.employeeId, role: role, email: data.email }, 'weeb');
                    response.setHeader('Set-Cookie', cookie.serialize('token', token, {
                        httpOnly: true,
                        maxAge: 60 * 60
                    }));
                    return response.json(result);
                }
                else {
                    response.status(400).json({ error: "Email da duoc su dung" });
                }

            } else {
                response.status(400).json({ error: 'email khong co quyen truy cap vao he thong' });
                // response.redirect("Trang trủ")
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
            //     deleted: true,
            //     deletedAt: new Date()
            // }).catch(error => {
            //     response.status(500).send(error);
            // });
            userSchema.orderByChild("uid").equalTo(uid).get().then(snapshot => {
                snapshot.ref.update({
                    deleted: true,
                    deletedAt: new Date()
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
            if (user.exists && data?.deleted) {
                // await userSchema.doc(uid).update({
                //     deleted: false,
                //     deletedAt: null
                // });
                user.ref.update({
                    deleted: false,
                    deletedAt: null
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
