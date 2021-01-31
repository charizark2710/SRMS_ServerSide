import * as express from 'express';
import * as functions from 'firebase-functions';
import cookie from "cookie"
import jwt from "jsonwebtoken";

export default async function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        const cookies = cookie.parse(req.headers.cookie || '');
        if (!cookies.token) {
            return res.status(401).send({ message: 'Unauthorized' });
        } else if (!cookies.token.startsWith('Bearer')) {
            return res.status(401).send({ message: 'Unauthorized' });
        } else {
            const split = cookies.token.split('Bearer ');
            if (split.length !== 2)
                return res.status(401).send({ message: 'Unauthorized' });
            const token = split[1];
            try {

                jwt.verify(token, functions.config().other.secretOrPublicKey as string, (err, decoded: any) => {
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