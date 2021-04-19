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
            var result: any[] = [];
            let fromDateData = request.query.fromDate;
            let toDateData = request.query.toDate;

            const tempFromDate = (fromDateData as string).split("-");
            const fromDate = tempFromDate[0] + tempFromDate[1] + tempFromDate[2];
            const tempToDate = (toDateData as string).split("-");
            const toDate = tempToDate[0] + tempToDate[1] + tempToDate[2];

            const reqFromDate = parseInt(fromDate)
            const reqToDate = parseInt(toDate)

            for (let index = reqFromDate; index <= reqToDate; index++) {
                await db.ref('report').child(index.toString()).get().then(snapshot => {
                    if (snapshot) {
                        const date = parseInt(snapshot.key as string);
                        let dateFormat=date.toString().substring(0,4)+"/"+date.toString().substring(4,6)+"/"+date.toString().substring(6)
                        let value = snapshot.val();
                        if (index === date) {
                            let data = {
                                date: dateFormat,
                                light: value.light!==null? parseInt(value.light):0,
                                fan: value.fan!==null?parseInt(value.fan):0,
                                powerPlug: value.powerPlug!==null?parseInt(value.powerPlug):0,
                                conditioner: value.conditioner!==null?parseInt(value.conditioner):0,
                            }
                            result.push(data);
                        }
                    }
                });
            }
            console.log(result);

            response.status(200).send(result);
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }


}
