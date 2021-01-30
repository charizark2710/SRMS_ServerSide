import * as express from 'express';
import { userSchema } from "../model/UserModel";
import { adminAuth } from "../connector/configFireBase"
import cookie from "cookie"
import jwt from "jsonwebtoken";
import { UserController } from './UserController'
import notification from './NotificationManagement'
import * as functions from 'firebase-functions';

export class Login {
    router = express.Router();
    url = "/login";
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.url, this.login);
    }

    login = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const decodedToken = await adminAuth.verifyIdToken(data.idToken);
            const email = decodedToken.email;
            // const query = await userSchema.where('deleted', '==', false).where('email', '==', email).get();
            const user = await adminAuth.getUser(decodedToken.uid);
            const query = (await userSchema.child(data.employeeId + "/email").get()).val();
            let result;
            const eType = email?.split('@')[1];
            if (eType === 'fpt.edu.vn') {
                const idNum = email?.match('/[a-zA-Z]+|[0-9]+(?:\.[0-9]+)?|\.[0-9]+/g')?.toString();
                if (idNum?.length! >= 4) {
                    await adminAuth.setCustomUserClaims(data.uid, { role: 'student' });
                    result = userSchema.child(data.employeeId).set({
                        email: email!,
                        name: data.name!,
                        banned: false,
                        uid: data.uid!,
                        bannedAt: null
                    });
                } else {
                    await adminAuth.setCustomUserClaims(data.uid, { role: 'lecture' });
                    result = userSchema.child(data.employeeId).set({
                        email: email!,
                        name: data.name!,
                        uid: data.uid!,
                        banned: false,
                        bannedAt: null
                    });
                }
                const role = (await adminAuth.getUser(data.uid)).customClaims?.role;
                const token = 'Bearer ' + jwt.sign({ uid: data.uid, employeeId: data.employeeId, role: role, email: email }, functions.config().other.secretOrPublicKey as string);
                response.setHeader('Set-Cookie', cookie.serialize('token', token, {
                    httpOnly: true,
                    maxAge: 60 * 60
                }));
                return response.json('ok');
            } else {
                await adminAuth.setCustomUserClaims(data.uid, { role: 'admin' });
                result = userSchema.child(data.employeeId).set({
                    email: email!,
                    name: data.name!,
                    uid: data.uid!,
                    banned: false,
                    bannedAt: null
                });
                const role = (await adminAuth.getUser(data.uid)).customClaims?.role;
                const token = 'Bearer ' + jwt.sign({ uid: data.uid, employeeId: data.employeeId, role: role, email: data.email }, functions.config().other.secretOrPublicKey as string);
                response.setHeader('Set-Cookie', cookie.serialize('token', token, {
                    httpOnly: true,
                    maxAge: 60 * 60
                }));
                return response.json('ok');
            }

        } catch (e) {
            console.log(e);
            response.status(500).json({ error: e });
        }
    }
}

