import * as express from 'express';

export default function authorized(opts: { hasRole: Array<'admin' | 'client'>, allowSameUser?: boolean }) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const local = res.locals;
        const id = req.params.id;
        if (opts.allowSameUser && id && local.uid === id) {
            return next();
        }
        if (!local.role) {
            return res.status(403).send('Chua dang nhap');
        }
        if (opts.hasRole.includes(local.role) && local.uid === id) {
            return next()
        }
        return res.status(403).send();
    }
}