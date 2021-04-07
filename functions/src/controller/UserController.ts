import { userSchema, User } from '../model/UserModel'
import * as express from 'express';
import { adminAuth } from "../connector/configFireBase"
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
        // this.router.delete(this.path + "/ban/:id", auth, authorized({ hasRole: ['admin'] }), this.banUser);
        // this.router.patch(this.path + "/banned/:id/restore", auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.restoreUser);
        // this.router.get(this.path + '/:id', auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.getUser);

        this.router.patch(this.path + '/banUser', this.banUser);
        this.router.patch(this.path + '/unbanUser', this.unbanUser);
        this.router.get(this.path + '/banned', this.getBannedUsers);
        this.router.get(this.path + '/unbanned', this.getUnbannedUsers);
    }

    // banUser = async (request: express.Request, response: express.Response) => {
    //     try {
    //         const uid = request.params.id;
    //         const user = await adminAuth.deleteUser(uid);
    //         // userSchema.doc(uid).update({
    //         //     banned: true,
    //         //     bannedAt: new Date()
    //         // }).catch(error => {
    //         //     response.status(500).send(error);
    //         // });
    //         userSchema.orderByChild("uid").equalTo(uid).get().then(snapshot => {
    //             snapshot.ref.update({
    //                 banned: true,
    //                 bannedAt: new Date()
    //             });
    //         });
    //         response.send(user);
    //     } catch (error) {
    //         response.status(500).send(error);
    //     }
    // }

    // restoreUser = async (request: express.Request, response: express.Response) => {
    //     try {
    //         const uid = request.params.id;
    //         const user = await userSchema.child(uid).get();
    //         const data = await user.val();
    //         // const user = await userSchema.doc(uid).get();
    //         // const data = user.data();
    //         if (user.exists() && data?.banned) {
    //             // await userSchema.doc(uid).update({
    //             //     banned: false,
    //             //     bannedAt: null
    //             // });
    //             user.ref.update({
    //                 banned: false,
    //                 bannedAt: null
    //             });
    //             const userRecord = await adminAuth.createUser({
    //                 uid: uid,
    //                 email: data.email,
    //                 displayName: data.name,
    //             });
    //             await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'client' });
    //             return response.send(userRecord);
    //         }
    //         response.send("Nguoi dung khong ton tai");
    //     } catch (error) {
    //         console.log(error);
    //         response.status(500).send(error);
    //     }
    // }
    banUser = (request: express.Request, response: express.Response) => {
        try {
            var data = request.body;//list banning users
            const result: any[] = []

            if (data) {
                data.forEach(async (user: any) => {
                    const userObj: User = JSON.parse(user);
                    var userId = userObj.email.split('@')[0] || ' ';
                    var bannedAt = (new Date()).toString();

                    await userSchema.child(userId).update({
                        banned: true,
                        bannedAt: bannedAt
                    })
                    await userSchema.child(userId).get().then(function (snapshot) {
                        const value: User = snapshot.val();
                        result.push({
                            email: value.email,
                            role: value.role,
                            bannedAt: value.bannedAt,
                            banned: value.banned,
                        })
                        if (result.length === data.length) {
                            return response.json(result)
                        }

                    })
                })
            }
            // return response.status(200).json(result)
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }
    unbanUser = async (request: express.Request, response: express.Response) => {
        try {
            var data = request.query.id as string;
            var userId="";
            if(data){
                userId = data.split('@')[0] ;
            }
            await userSchema.child(userId).update({
                banned: false,
                bannedAt: null,
            })
            return response.status(200).json(data)
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }
    // getUser = async (request: express.Request, response: express.Response) => {
    //     try {
    //         const uid = request.params.id;
    //         // const user = await userSchema.doc(uid).get();
    //         const date = new Date();
    //         const fullDate = date.getFullYear().toString().concat(date.getMonth().toString(), date.getDate().toString(), '-', date.getHours().toString(), date.getMinutes().toString(), date.getSeconds().toString(), date.getMilliseconds().toString());
    //         const id = uid + '-' + fullDate;//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết
    //         const user = await userSchema.child(uid).get();
    //         notification.sendMessage({
    //             id: id,
    //             message: "You view Yourself",
    //             receiver: uid,
    //             sender: 'admin',
    //             sendAt: fullDate,
    //             isRead: false
    //         })
    //         response.json(user.val());
    //     } catch (error) {
    //         console.log(error);
    //         response.status(500).json(error);
    //     }
    // }

    getBannedUsers = async (request: express.Request, response: express.Response) => {
        try {
            var result: any[] = [];
            (await userSchema.get()).forEach(snapshot => {
                const value = snapshot.val();
                if (value.banned) {
                    result.push(value);
                }

            });
            return response.status(200).json(result)
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }

    getUnbannedUsers = async (request: express.Request, response: express.Response) => {
        try {
            var result: any[] = [];
            (await userSchema.get()).forEach(snapshot => {
                const value = snapshot.val();
                if (!value.banned) {
                    result.push(value.email);
                }

            });
            return response.status(200).json(result)
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }

}
