import * as express from 'express';
import { userSchema } from "../model/UserModel";
import { adminAuth } from "../connector/configFireBase"
import cookie from "cookie"
import jwt from "jsonwebtoken";
import { UserController } from './UserController'

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
            console.log(user.customClaims?.role + '/' + data.employeeId + '/email');
            const query = (await userSchema.child(user.customClaims?.role + '/' + data.employeeId + "/email").get()).val();

            if (query && query.toString() === email) {
                const token = 'Bearer ' + jwt.sign({ uid: user.uid, employeeId: data.employeeId, role: user.customClaims?.role, email: user.email }, 'weeb');
                response.setHeader('Set-Cookie', cookie.serialize('token', token, {
                    httpOnly: true,
                    maxAge: 60 * 60
                }));
                response.json({ message: 'ok' });
            } else {
                request.body = { email: email, uid: data.uid, name: data.name, employeeId: data.employeeId };
                const controller = new UserController();

                controller.addUser(request, response);
            }
        } catch (e) {
            console.log(e);
            response.status(500).json({ error: e });
        }
    }
}

