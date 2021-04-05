import e, * as express from 'express';
import { userSchema, User } from "../model/UserModel";
import { adminAuth, db } from "../connector/configFireBase"
import cookie from "cookie"
import jwt from "jsonwebtoken";
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
            let result;
            const eType = email?.split('@')[1];
            const employeeId = email?.split('@')[0];
            if ((await userSchema.child(employeeId as string).get()).exists()) {
                if ((await (await userSchema.child(employeeId as string).get()).val() as User).banned) {
                    return response.status(403).json('may bi ban roi');
                } else {
                    const role = (await adminAuth.getUser(data.uid)).customClaims?.role;
                    const token = 'Bearer ' + jwt.sign({ uid: data.uid, employeeId: data.employeeId, role: role, email: data.email }, functions.config().other.secret_or_publickey as string);
                    response.setHeader('Set-Cookie', cookie.serialize('token', token, {
                        httpOnly: true,
                        maxAge: 60 * 60,
                        sameSite: 'none',
                        secure: true
                    }));
                    return response.json('ok');
                }
            } else {
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
                    const token = 'Bearer ' + jwt.sign({ uid: data.uid, employeeId: data.employeeId, role: role, email: email }, functions.config().other.secret_or_publickey as string);
                    response.setHeader('Set-Cookie', cookie.serialize('token', token, {
                        httpOnly: true,
                        maxAge: 60 * 60,
                        sameSite: 'none',
                        secure: true
                    }));
                    return response.json('ok');
                } else if (eType === 'fe.edu.vn' || email === 'dangduchieudn99@gmail.com') {
                    await adminAuth.setCustomUserClaims(data.uid, { role: 'admin' });
                    result = userSchema.child(data.employeeId).set({
                        email: email!,
                        name: data.name!,
                        uid: data.uid!,
                        banned: false,
                        bannedAt: null
                    });
                    const role = (await adminAuth.getUser(data.uid)).customClaims?.role;
                    const token = 'Bearer ' + jwt.sign({ uid: data.uid, employeeId: data.employeeId, role: role, email: data.email }, functions.config().other.secret_or_publickey as string);
                    response.setHeader('Set-Cookie', cookie.serialize('token', token, {
                        httpOnly: true,
                        maxAge: 60 * 60,
                        sameSite: 'none',
                        secure: true
                    }));
                    return response.json('ok');
                } else {
                    return response.status(400).json({ error: "Sai Email" });
                }
            }
        } catch (e) {
            console.log(e);
            response.status(500).json({ error: e });
        }
    }
}

