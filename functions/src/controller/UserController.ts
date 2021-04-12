import { userSchema, User } from '../model/UserModel'
import * as express from 'express';
import auth from './Authenticate';
import authorized from './Authorized';

export class UserController {
    public router = express.Router();
    path = '/users'
    constructor() {
        this.init();
    }

    init() {
        this.router.patch(this.path + '/banUser', auth, authorized({ hasRole: ['admin'] }), this.banUser);
        this.router.patch(this.path + '/unbanUser', auth, authorized({ hasRole: ['admin'] }), this.unbanUser);
        this.router.get(this.path + '/banned', auth, authorized({ hasRole: ['admin'] }), this.getBannedUsers);
        this.router.get(this.path + '/unbanned', auth, authorized({ hasRole: ['admin'] }), this.getUnbannedUsers);
    }

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
            var userId = "";
            if (data) {
                userId = data.split('@')[0];
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

    getBannedUsers = async (request: express.Request, response: express.Response) => {
        try {
            var result: any[] = [];
            (await userSchema.orderByChild('banned').equalTo(true).get()).forEach(snapshot => {
                const value = snapshot.val();
                result.push(value);
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
            (await userSchema.orderByChild('banned').equalTo(false).get()).forEach(snapshot => {
                const value = snapshot.val();
                result.push(value.email);
            });
            return response.status(200).json(result)
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }

}
