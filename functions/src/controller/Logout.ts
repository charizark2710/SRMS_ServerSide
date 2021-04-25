import * as express from 'express';
import cookie from "cookie"

export class Logout {
    router = express.Router();

    constructor() {
        this.init();
    }

    init() {
        this.router.post('/logout', async (request: express.Request, response: express.Response) => {
            try {
                response.setHeader('Set-Cookie', cookie.serialize('token', '', {
                    expires: new Date(),
                    secure: true,
                    sameSite: 'none',
                    httpOnly: true
                }));
                response.json("user logout");
            } catch (error) {
                response.status(500).json(error);
            }
            
        });
    }
}