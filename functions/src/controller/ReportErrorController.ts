import * as express from 'express';
import { db, adminAuth } from "../connector/configFireBase"
import auth from './Authenticate';
import authorized from './Authorized';
import notification from './NotificationManagement'

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
        this.router.put(this.path + "/update", this.updateReportError);
        this.router.get(this.path + '/:id', auth, this.viewDetailReportError);
        this.router.get(this.path + '/edit/:id', this.getReportErrorById);
    }

    //user gửi requuest => admin + user nhận thông báo 
    sendRepportError = async (request: express.Request, response: express.Response) => {
        try {
            var data = request.body;//roomName, deviceName, des

            //tạo ID
            const time = new Date();
            const tempM = (time.getMonth() + 1).toString();
            const tempD = time.getDate().toString();
            const year = time.getFullYear().toString();
            const month = tempM.length === 2 ? tempM : '0' + tempM;
            const date = tempD.length === 2 ? tempD : '0' + tempD;
            const tempH = time.getHours().toString();
            const tempMin = time.getMinutes().toString();
            const tempSec = time.getSeconds().toString();
            const tempMs = time.getMilliseconds().toString();
            const hours = tempH.length === 2 ? tempH : '0' + tempH;
            const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
            const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
            tempMs.length === 1 ? tempMs + '0' : tempMs;
            const ms = tempMs.length === 3 ? tempMs : '0' + tempMs;
            const fullTime = year.concat(month, date) + "-" + hours.concat(min, sec, ms);
            const id = data.userId.toString() + '-' + fullTime;//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết

            var deviceNames = "";
            if (data.deviceNames) {
                data.deviceNames.forEach((d: string) => {
                    deviceNames += " " + d + " "
                });
            }


            await db.ref('complaint').child(id).set({
                roomName: data.roomName,
                deviceNames: data.deviceNames,
                description: data.description,
                status: "pending",
                userId: data.userId,
                id: id,
                actionNotiId:id
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //gửi cho admin
                    notification.sendMessage({
                        message: ' sent a request to report error at room ' + data.roomName,
                        receiver: "admin",
                        sender: data.userId,
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/reportErrorRequest/" + id,
                        isValid: true,
                    });
                    //gửi cho chính user make request
                    notification.sendMessage({
                        message: 'Sending request to report error' + ' at room ' + data.roomName + ' successfully',
                        receiver: data.userId,
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
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
            var result = {};
            var id = request.params.id;
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
            const actionNotiId=request.query.actionNotiId;
            const userId = reportErrId?.split('-')[0] || ' ';

            const time = new Date();
            const tempM = (time.getMonth() + 1).toString();
            const tempD = time.getDate().toString();
            const year = time.getFullYear().toString();
            const month = tempM.length === 2 ? tempM : '0' + tempM;
            const date = tempD.length === 2 ? tempD : '0' + tempD;
            const tempH = time.getHours().toString();
            const tempMin = time.getMinutes().toString();
            const tempSec = time.getSeconds().toString();
            const hours = tempH.length === 2 ? tempH : '0' + tempH;
            const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
            const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
            const fullTime = year.concat(month, date) + "-" + hours.concat(min, sec, '000');
            const id = userId.toString() + '-' + fullTime;

            //xóa trong booking, xóa hết noti
            await db.ref('complaint').child(reportErrId).update({
                status: "deleted",
            }).then(function () {
                //noti trước khi hủy trở thành invalid
                notification.updateIsValid(actionNotiId+'');
                //gửi cho admin
                notification.sendMessage({
                    message: ' deleted ' + message,
                    receiver: "admin",
                    sender: userId,
                    sendAt: fullTime,
                    isRead: false,
                    id: id,
                    url: "/reportErrorRequest/" + reportErrId,
                    isValid: false,
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
            var data = request.body;

            const time = new Date();
            const tempM = (time.getMonth() + 1).toString();
            const tempD = time.getDate().toString();
            const year = time.getFullYear().toString();
            const month = tempM.length === 2 ? tempM : '0' + tempM;
            const date = tempD.length === 2 ? tempD : '0' + tempD;
            const tempH = time.getHours().toString();
            const tempMin = time.getMinutes().toString();
            const tempSec = time.getSeconds().toString();
            const hours = tempH.length === 2 ? tempH : '0' + tempH;
            const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
            const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
            const fullTime = year.concat(month, date) + "-" + hours.concat(min, sec, '000');
            const id = data.userId.toString() + '-' + fullTime;


            await db.ref('complaint').child(data.id).update({
                status: data.status,
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //send noti to user
                    notification.sendMessage({
                        message: 'Your request to report error' + ' at room ' + data.roomName + ' has been ' + data.status,
                        receiver: data.userId,
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
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
            const time = new Date();
            const tempM = (time.getMonth() + 1).toString();
            const tempD = time.getDate().toString();
            const year = time.getFullYear().toString();
            const month = tempM.length === 2 ? tempM : '0' + tempM;
            const date = tempD.length === 2 ? tempD : '0' + tempD;
            const tempH = time.getHours().toString();
            const tempMin = time.getMinutes().toString();
            const tempSec = time.getSeconds().toString();
            const hours = tempH.length === 2 ? tempH : '0' + tempH;
            const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
            const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
            const fullTime = year.concat(month, date) + "-" + hours.concat(min, sec, '000');
            const id = data.id?.split('-')[0].toString() + '-' + fullTime;


            await db.ref('complaint').child(data.id).update({
                roomName: data.roomName,
                deviceNames: data.deviceNames,
                description: data.description,
                actionNotiId:id,
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //noti trước khi cập nhật trở thành invalid
                    notification.updateIsValid(data.actionNotiId);
                    //gửi cho admin
                    notification.sendMessage({
                        message: ' changed a request to report error at room ' + data.roomName,
                        receiver: "admin",
                        sender: data.id?.split('-')[0] || ' ',
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/reportErrorRequest/" + data.id,
                        isValid: true,
                    });
                    //gửi cho chính user make request
                    notification.sendMessage({
                        message: 'You changed a report error request' + ' at room ' + data.roomName,
                        receiver: data.id?.split('-')[0] || ' ',
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                    });
                }
            });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }
}
