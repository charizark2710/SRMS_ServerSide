import * as express from 'express';
import { db } from "../connector/configFireBase"
import auth from './Authenticate';

export class RequestListController {
    public router = express.Router();
    path = '/requestList'
    constructor() {
        this.init();
    }

    init() {
        // this.router.patch(this.path + "/banned/:id/restore", auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.restoreRoom);
        this.router.get(this.path, auth, this.getRequestList);
        this.router.get(this.path + "/:currentUser", auth, this.getHistoryRequestForUser);
        this.router.delete(this.path + '/delete', auth, this.deleteRequestList);
    }

    getRequestList = async (request: express.Request, response: express.Response) => {
        try {
            const result: any[] = [];
            (await db.ref('notification').child('admin').get()).forEach(snapshot => {
                const value = snapshot.val();
                if (value.url !== "") {
                    result.push(value);
                }

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
                    await db.ref('notification').child('admin').child(deleteRequestIds[index]).update({
                        url: ""
                    });
                }
            }
            response.status(200).json(deleteRequestIds);
        } catch (error) {
            response.status(500).send(error);
        }
    }


    getHistoryRequestForUser = async (request: express.Request, response: express.Response) => {
        try {
            let result: any[] = [];
            const currentUser = response.locals.employeeId;
            const snapBooking = (await db.ref("booking").orderByChild('userId').equalTo(currentUser).get()).val();

            if (snapBooking) {
                for (const [key, val] of Object.entries(snapBooking)) {
                    const value: any = val;
                    if (value.status !== "deleted") {
                        //format date
                        let year = value.date?.substring(0, 4);
                        let month = value.date?.substring(4, 6);
                        let day = value.date?.substring(6);
                        let formatedDate = year + "-" + month + "-" + day;

                        //format time
                        let sHour = value.startTime?.substring(0, 2);
                        let sMinus = value.startTime?.substring(2, 4);
                        let sSencond = value.startTime?.substring(4, 6);
                        let formatedStartTime = sHour + ":" + sMinus + ":" + sSencond;

                        let eHour = value.endTime?.substring(0, 2);
                        let eMinus = value.endTime?.substring(2, 4);
                        let eSencond = value.endTime?.substring(4, 6);
                        let formatedEndTime = eHour + ":" + eMinus + ":" + eSencond;

                        const bookingReq = {
                            id: key,
                            title: "request to book room " + value.roomName + " at " + formatedDate + " " + formatedStartTime + "-" + formatedEndTime,
                            requestType: "bookRoomRequest",
                            requestTime: key,
                            status: value.status,
                            date: value.date,
                            endTime: value.endTime
                        }
                        result.push(bookingReq);
                    }
                }
            }

            const snapComplaint = (await db.ref("complaint").orderByChild('userId').equalTo(currentUser).get()).val();
            if (snapComplaint) {
                for (const [key, val] of Object.entries(snapComplaint)) {
                    const value: any = val;
                    if (value.status !== "deleted") {
                        const bookingReq = {
                            id: key,
                            title: "request to report error at room " + value.roomName,
                            requestType: "reportErrorRequest",
                            requestTime: key,
                            status: value.status,
                        }
                        result.push(bookingReq);
                    }
                }
            }
            response.status(200).json(result);
        } catch (error) {
            response.status(500).send(error);
        }
    }
}
