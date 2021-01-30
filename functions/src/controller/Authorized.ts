import * as express from 'express';

export default function authorized(opts: { hasRole: Array<'admin' | 'student' | 'lecture'>, allowSameUser?: boolean }) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const local = res.locals;
        const id = req.params.id;
        if (opts.allowSameUser && id && local.employeeId === id) {
            return next();
        }
        if (!local.role) {
            return res.status(403).redirect('http://localhost:3000/login');
        }
        if (opts.hasRole.includes(local.role) && local.employeeId === id) {
            return next()
        }
        return res.status(403).send();
    }
}