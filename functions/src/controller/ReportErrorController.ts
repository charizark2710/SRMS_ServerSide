import { userSchema } from '../model/UserModel'
import * as express from 'express';
import { db, adminAuth } from "../connector/configFireBase"
import auth from './Authenticate';
import authorized from './Authorized';
import notification from './NotificationManagement'
import { roomSchema, Room } from '../model/Room'

export class ReportErrorController {
    public router = express.Router();
    path = '/reportError'
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.path + "/sendReportError", auth, this.sendRepportError);
        // this.router.post(this.path, this.createBookingRoom);
        this.router.delete(this.path + "/delete/:id", auth, authorized({ hasRole: ['admin'] }), this.deleteReportError);
        this.router.patch(this.path + "/acceptOrRejectReportError", auth, authorized({ hasRole: ['admin'] }), this.acceptOrRejectReportError);
        // this.router.put(this.path + "/updating", this.updateBooking);
        this.router.get(this.path + '/:id', auth, this.viewDetailReportError);
        // this.router.get(this.path + '/editting/:id', this.getBookingById);
    }

    //user gửi requuest => admin + user nhận thông báo 
    sendRepportError = async (request: express.Request, response: express.Response) => {
        try {
            var data = request.body;//roomName, deviceName, des
            var deviceNames = "";
            if (data.deviceNames) {
                data.deviceNames.forEach((d: string) => {
                    deviceNames += " " + d + " "
                });
            }

            const date = new Date();
            const fullDate = date.getFullYear().toString().concat(date.getMonth().toString(), date.getDate().toString(), '-', date.getHours().toString(), date.getMinutes().toString(), date.getSeconds().toString());
            const id = data.userId.toString() + '-' + fullDate;//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết
            await db.ref('ReportError').child(id).set({
                roomName: data.roomName,
                deviceNames: data.deviceNames,
                description: data.description,
                status: data.status,
                userId: data.userId,
                id: id //to update or tracking data
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //gửi cho admin
                    notification.sendMessage({
                        message: ' sent a request to report error at room ' + data.roomName,
                        receiver: "admin",//fake account admin
                        sender: data.userId,
                        sendAt: (new Date()).toString(),
                        isRead: false,
                        typeRequest: 'reportErrorRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                        id: id,
                        status: data.status,
                    });
                    //gửi cho chính user make request
                    notification.sendMessage({
                        message: 'Your request to report error ' + '(' + deviceNames + ')' + ' at room ' + data.roomName,
                        receiver: data.userId,
                        sender: "admin",//fake account admin
                        sendAt: (new Date()).toString(),
                        isRead: false,
                        typeRequest: 'reportErrorRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                        id: id,
                        status: data.status,
                    });
                }
            });

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
            await db.ref('ReportError').child(id).get().then(function (snapshot) {
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
            var reportErrId = request.params.id;
            var userId = reportErrId?.split('-')[0] || ' ';
            //xóa trong booking, xóa hết noti
            await db.ref('ReportError').child(reportErrId).remove()
                .then(function () {
                    //xoa noti user
                    db.ref('notification').child(userId).child(reportErrId.toString()).update({url: null});
                    //xoa noti admin
                    db.ref('notification').child('admin').child(reportErrId.toString()).update({url: null});
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
            var deviceNames = "";
            if (data.deviceNames) {
                data.deviceNames.forEach((d: string) => {
                    deviceNames += " " + d + " "
                });
            }
            await db.ref('ReportError').child(data.id).update({
                status: data.status,
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //send noti to user
                    notification.updateAdminApprovalStatus(data.id, data.status, data.id?.split('-')[0] || ' ', (new Date()).toString());
                }
            });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }

    updateReportError = async (request: express.Request, response: express.Response) => {
        try {
            var data = request.body;
            var deviceNames = "";
            if (data.deviceNames) {
                data.deviceNames.forEach((d: string) => {
                    deviceNames += " " + d + " "
                });
            }
            await db.ref('Booking').child(data.id).set({
                roomName: data.roomName,
                deviceNames: data.deviceNames,
                description: data.description,
                status: data.status,
                userId: data.userId,
                id: data.id //to update or tracking data
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //send noti to user
                    notification.sendMessage({
                        message: ' sent a request to report error at room ' + data.roomName,
                        receiver: "admin",//fake account admin
                        sender: data.userId,
                        sendAt: (new Date()).toString(),
                        isRead: false,
                        id: data.id,
                    });
                    //gửi cho admin
                    notification.sendMessage({
                        message: 'Your request to report error ' + '(' + deviceNames + ')' + ' at room ' + data.roomName,
                        receiver: data.userId,
                        sender: "admin",//fake account admin
                        sendAt: (new Date()).toString(),
                        isRead: false,
                        id: data.id,
                    });
                }
            });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }
}
