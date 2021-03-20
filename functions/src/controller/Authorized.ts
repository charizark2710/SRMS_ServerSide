import * as express from 'express';
import {adminAuth} from '../connector/configFireBase'

export default function authorized(opts: { hasRole: Array<'admin' | 'student' | 'lecture'>, allowSameUser?: boolean }) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const local = res.locals;
        const id = req.params.id;
        if (opts.allowSameUser && id && local.employeeId === id) {
            return next();
        }
        if (!local.role) {
            return res.status(403).send({ message: 'Unauthorized' });
        }
        if (opts.hasRole.includes(local.role) && local.employeeId === id) {
            return next()
        }
        return res.status(403).send();
    }
}

function roomPermission() {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const local = res.locals;
        if (local.role === 'admin') {
            return next();
        }else {
            const room = (await adminAuth.getUser(local.uid)).customClaims?.room;
            if(room){
                res.locals = {...res.locals, room: room};
                return next();
            }
            return res.status(403).send('may khong vo duoc phong nay');   
        }
    }
}

export {roomPermission}