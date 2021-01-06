import * as express from 'express';
import admin = require("firebase-admin");
import cookie from "cookie"
import jwt from "jsonwebtoken";

export default async function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        const cookies = cookie.parse(req.headers.cookie || '');
        if (!cookies.token) {
            return res.status(401).json({ message: "Authentication Failed" });
        } else if (!cookies.token.startsWith('Bearer')) {
            return res.status(401).send({ message: 'Unauthorized' });
        } else {
            const split = cookies.token.split('Bearer ');
            if (split.length !== 2)
                return res.status(401).send({ message: 'Unauthorized' });
            const token = split[1];
            try {
                jwt.verify(token, 'weeb', (err, decoded: any) => {
                    console.log("decodedToken: ", JSON.stringify(decoded))
                    res.locals = { ...res.locals, uid: decoded?.uid, role: decoded?.role, email: decoded?.email, employeeId: decoded?.employeeId };
                });
                next();
            } catch (e) {
                console.error(e);
                res.status(500).json({ message: "Token Invalid" });
            }
        }
    } catch (error) {
        return res.status(500).send(error);
    }

}