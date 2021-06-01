import { db, adminAuth } from "../connector/configFireBase"
import auth from './Authenticate';
import * as express from 'express';

export class NotifyController {
    public router = express.Router();
    path = '/notify'
    constructor() {
        this.init();
    }

    init() {
        // this.router.patch(this.path + "/banned/:id/restore", auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.restoreRoom);
        this.router.patch(this.path + '/:id', auth, this.readReport);
    }

    readReport = async (request: express.Request, response: express.Response) => {
        const id = request.params.id;
        db.ref('notification').child(response.locals.employeeId).child(id).update({
            isRead: true,
        });
        response.status(200).json('ok');
    }

}