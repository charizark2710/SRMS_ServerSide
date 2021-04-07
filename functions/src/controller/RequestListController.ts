import { userSchema } from '../model/UserModel'
import * as express from 'express';
import { db, adminAuth } from "../connector/configFireBase"
import auth from './Authenticate';
import authorized from './Authorized';
import notification from './NotificationManagement'
import { roomSchema, Room } from '../model/Room'

export class RequestListController {
    public router = express.Router();
    path = '/requestList'
    constructor() {
        this.init();
    }

    init() {
        // this.router.patch(this.path + "/banned/:id/restore", auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.restoreRoom);
        this.router.get(this.path, auth, this.getRequestList);
        this.router.delete(this.path + '/delete/:ids', auth, this.deleteRequestList);
    }

    getRequestList = async (request: express.Request, response: express.Response) => {
        try {
            var result: any[] = [];
            (await db.ref('notification').child('admin').get()).forEach(snapshot => {
                const value = snapshot.val();
                console.log(snapshot.val());

                result.push(value);

            });
            response.status(200).send(result);
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }

    deleteRequestList = async (request: express.Request, response: express.Response) => {
        try {
            const deleteRequest = request.query.ids as string;
            let deleteRequestIds: string[] = deleteRequest?.split(',');
            if (deleteRequestIds) {
                for (let index = 0; index < (deleteRequestIds.length - 1); index++) {
                    await db.ref('notification').child('admin').child(deleteRequestIds[index]).remove();
                }
            }
            response.status(200).json(deleteRequestIds);
        } catch (error) {
            response.status(500).send(error);
        }
    }

}
