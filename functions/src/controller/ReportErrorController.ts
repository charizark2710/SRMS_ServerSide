import * as express from 'express';
import { db, adminAuth } from "../connector/configFireBase"
import auth from './Authenticate';
import authorized from './Authorized';
import notification from './NotificationManagement'
import getUTC from '../common/formatDate'

export class ReportErrorController {
    public router = express.Router();
    path = '/reportError'
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.path + "/sendReportError", auth, this.sendRepportError);
        // this.router.post(this.path, this.createBookingRoom);
        this.router.patch(this.path + "/delete/:id", auth, this.deleteReportError);
        this.router.patch(this.path + "/acceptOrRejectReportError", auth, authorized({ hasRole: ['admin'] }), this.acceptOrRejectReportError);
        this.router.put(this.path + "/update", auth, this.updateReportError);
        this.router.get(this.path + '/:id', auth, this.viewDetailReportError);
        this.router.get(this.path + '/edit/:id', auth, this.getReportErrorById);
    }

    //user gửi requuest => admin + user nhận thông báo 
    sendRepportError = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;//roomName, deviceName, des

            //tạo ID
            const fullTime = getUTC(new Date());
            const id = fullTime + data.userId.toString();//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết

            let deviceNames = "";
            if (data.deviceNames) {
                data.deviceNames.forEach((d: string) => {
                    deviceNames += " " + d + " "
                });
            }

            await db.ref('complaint').child(id).set({
                roomName: data.roomName,
                deviceNames: deviceNames,
                description: data.description,
                status: "pending",
                userId: data.userId,
                id: id,
                actionNotiId: id
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //gửi cho admin
                    notification.sendMessage({
                        message: ' sent a request to report error at room ' + data.roomName + ' (' + deviceNames + ')',
                        receiver: "admin",
                        sender: data.userId,
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/reportErrorRequest/" + id,
                    });
                    //gửi cho chính user make request
                    notification.sendMessage({
                        message: 'Sending request to report error' + ' at room ' + data.roomName + ' successfully',
                        receiver: data.userId,
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/reportErrorRequest/" + id,
                    });
                }
            });
            return response.status(200).json(data);
        } catch (error) {
            response.status(500).send(error);
        }
    }

    viewDetailReportError = async (request: express.Request, response: express.Response) => {
        try {
            let result = {};
            const id = request.params.id;
            db.ref('notification').child('admin').child(id.toString()).update({
                isRead: true
            });
            await db.ref('complaint').child(id).get().then(function (snapshot) {
                if (snapshot.exists()) {
                    result = snapshot.val();
                }
                else {
                    console.log("No data available");
                }
            }).catch(function (error) {
                console.error(error);
            });
            return response.status(200).json(result);
        } catch (err) {
            response.status(500).send(err);
        }
    }

    deleteReportError = async (request: express.Request, response: express.Response) => {
        try {
            const reportErrId = request.params.id;
            const message = request.query.message;
            const actionNotiId = request.query.actionNotiId;
            const userId = reportErrId?.split('-')[0] || ' ';
            const fullTime = getUTC(new Date());
            const id = userId.toString() + '-' + fullTime;

            //xóa trong booking, xóa hết noti
            await db.ref('complaint').child(reportErrId).update({
                status: "deleted",
            }).then(function () {
                //gửi cho admin
                notification.sendMessage({
                    message: ' deleted ' + message,
                    receiver: "admin",
                    sender: userId,
                    sendAt: fullTime,
                    isRead: false,
                    id: id,
                    url: "/reportErrorRequest/" + reportErrId,
                });
                //gửi cho chính user make request
                notification.sendMessage({
                    message: 'You deleted ' + message,
                    receiver: userId,
                    sender: "admin",
                    sendAt: fullTime,
                    isRead: false,
                    id: id,
                });

            })
                .catch(function (error) {
                    console.log("Remove failed: " + error.message)
                });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }

    //update trong booking / user/admin
    acceptOrRejectReportError = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const fullTime = getUTC(new Date());
            const id = data.userId.toString() + '-' + fullTime;


            await db.ref('complaint').child(data.id).update({
                status: data.status,
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //send noti to user
                    notification.sendMessage({
                        message: 'We appreciate that you reported the error in room ' + data.roomName,
                        receiver: data.userId,
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/reportErrorRequest/" + id,
                    });
                }
            });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }

    getReportErrorById = async (request: express.Request, response: express.Response) => {
        try {
            let result;
            const id = request.params.id;
            await db.ref('complaint').child(id).get().then(function (snapshot) {
                if (snapshot.exists()) {
                    result = snapshot.val();
                }
                else {
                    console.log("No data available");
                }
            }).catch(function (error) {
                console.error(error);
            });
            return response.status(200).json(result);
        } catch (err) {
            response.status(500).send(err);
        }
    }

    updateReportError = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const fullTime = getUTC(new Date());
            const id = fullTime + '-' + data.id?.split('-')[0].toString();

            await db.ref('complaint').child(data.id).update({
                roomName: data.roomName,
                deviceNames: data.deviceNames,
                description: data.description,
                actionNotiId: id,
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {

                    //gửi cho admin
                    notification.sendMessage({
                        message: ' changed a request to report error at room ' + data.roomName,
                        receiver: "admin",
                        sender: data.id?.split('-')[0] || ' ',
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/reportErrorRequest/" + data.id,
                    });
                    //gửi cho chính user make request
                    notification.sendMessage({
                        message: 'You changed a report error request' + ' at room ' + data.roomName,
                        receiver: data.id?.split('-')[0] || ' ',
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/reportErrorRequest/" + data.id,
                    });
                }
            });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }
}
