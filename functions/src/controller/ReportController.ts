import { userSchema } from '../model/UserModel'
import * as express from 'express';
import { db, adminAuth } from "../connector/configFireBase"
import auth from './Authenticate';
import authorized from './Authorized';
import notification from './NotificationManagement'
import { roomSchema, Room } from '../model/Room'

export class ReportController {
    public router = express.Router();
    path = '/report'
    constructor() {
        this.init();
    }

    init() {
        // this.router.patch(this.path + "/banned/:id/restore", auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.restoreRoom);
        this.router.get(this.path, auth, this.getReportData);
    }

    //bug: tạo mảng dates từ fromDate->toDate rồi foreach
    //không có giá trị ->bug
    getReportData = async (request: express.Request, response: express.Response) => {
        try {
            const result: any[] = [];
            const fromDateData = request.query.fromDate;
            const toDateData = request.query.toDate;

            const fDate = new Date(fromDateData as string);
            const tDate = new Date(toDateData as string);

            for (const d = fDate; d <= tDate; d.setDate(d.getDate() + 1)) {
                const date = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
                const snapshot = await db.ref('report').child(date).get();
                if (snapshot) {
                    const dateKey = snapshot.key as string;
                    const dateFormat = date.toString().substring(0, 4) + "/" + date.toString().substring(4, 6) + "/" + date.toString().substring(6)
                    const value = snapshot.val();
                    if (value) {
                        if (date === dateKey && value) {
                            const data = {
                                date: dateFormat,
                                light: value.light ? Math.floor(value.light / (1000 * 60 * 60)) : 0,
                                fan: value.fan ? Math.floor(value.fan / (1000 * 60 * 60)) : 0,
                                powerPlug: value.powerPlug ? Math.floor(value.powerPlug / (1000 * 60 * 60)) : 0,
                                conditioner: value.conditioner ? Math.floor(value.conditioner / (1000 * 60 * 60)) : 0,
                            }
                            result.push(data);
                        }

                    }
                }
            }
            console.log(result);

            response.status(200).send(result);
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }
}
