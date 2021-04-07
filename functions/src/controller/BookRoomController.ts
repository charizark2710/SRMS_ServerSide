import * as express from 'express';
import { db } from "../connector/configFireBase"
import notification from './NotificationManagement'
import auth from './Authenticate';
import authorized from './Authorized';
import { fullDay } from '../schedule/scheduleBuffer';

export class BookRoomController {
    public router = express.Router();
    path = '/bookRoom'
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.path + '/add', auth, this.createBookingRoom);
        this.router.delete(this.path + "/delete/:id", this.cancelBookingRoom);
        this.router.patch(this.path + "/acceptOrRejectBooking/:id", this.acceptOrRejectBooking);
        this.router.put(this.path + "/update", this.updateBooking);
        this.router.get(this.path + '/:id', this.viewDetailBookingRoom);
        this.router.get(this.path + '/edit/:id', this.getBookingById);
    }

    //save booking
    createBookingRoom = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;

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

            //format lại ngày, thời gian bắt đầu, kết thúc theo lịch đặt của user
            const bookingTime = data.date;
            const startTime = data.startTime;
            const endTime = data.endTime;
            const tempFullDate=bookingTime.split("-");
            const fullDate=tempFullDate[0]+tempFullDate[1]+tempFullDate[2];
            const tempStartTime=startTime.split(":");
            const fullStartTime=tempStartTime[0]+tempStartTime[1]+"00000";
            const tempEndTime=endTime.split(":");
            const fullEndTime=tempEndTime[0]+tempEndTime[1]+"00000";

            await db.ref('Booking').child(id)
                .set({
                    date: fullDate,
                    roomName: data.roomName,
                    startTime: fullStartTime,
                    endTime: fullEndTime,
                    reason: data.reason,
                    status: data.status,
                    userId: data.userId,
                }, async (error) => {
                    if (error) {
                        response.status(500).send(error);
                    } else {
                        //gửi cho admin
                        notification.sendMessage({
                            message: ' sent a request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime + ' to ' + data.endTime,
                            receiver: "admin",
                            sender: data.userId,
                            sendAt: fullTime,
                            isRead: false,
                            typeRequest: 'bookRoomRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                            id: id,
                            status: data.status
                        });
                        //gửi cho chính user đặt phòng
                        notification.sendMessage({
                            message: 'Your request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime + ' to ' + data.endTime,
                            receiver: data.userId,
                            sender: "admin",
                            sendAt: fullTime,
                            isRead: false,
                            typeRequest: 'bookRoomRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                            id: id,
                            status: data.status
                        });
                    }
                });
            return response.status(200).json(data);
        } catch (err) {
            response.status(500).send(err);
        }
    }

    viewDetailBookingRoom = async (request: express.Request, response: express.Response) => {
        try {
            let result = {};
            const id = request.params.id;
            db.ref('notification').child('admin').child(id.toString()).update({
                isRead: true
            });
            await db.ref('Booking').child(id).get().then(function (snapshot) {
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

    acceptOrRejectBooking = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;//id + status + roomName+date+time
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
            await db.ref('Booking').child(data.id).update({
                status: data.status,
            }, async (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //send noti to user
                    notification.updateAdminApprovalStatus(data.id, data.status, data.id?.split('-')[0] || ' ',fullTime);

                }
            });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }

    cancelBookingRoom = async (request: express.Request, response: express.Response) => {
        try {
            const bookingId = request.params.id;
            const userId = bookingId?.split('-')[0] || ' ';
            //xóa trong booking, xóa hết noti
            await db.ref('Booking').child(bookingId).remove()
                .then(function () {
                    //xoa noti user
                    db.ref('notification').child(userId).child(bookingId.toString()).remove();
                    //xoa noti admin
                    db.ref('notification').child('admin').child(bookingId.toString()).remove();
                })
                .catch(function (error) {
                    console.log("Remove failed: " + error.message)
                });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }

    getBookingById = async (request: express.Request, response: express.Response) => {
        try {
            let result;
            const id = request.params.id;
            //xóa trong booking, xóa hết noti
            await db.ref('Booking').child(id).get().then(function (snapshot) {
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

    updateBooking = async (request: express.Request, response: express.Response) => {
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

            //format lại ngày, thời gian bắt đầu, kết thúc theo lịch đặt của user
            const bookingTime = data.date;
            const startTime = data.startTime;
            const endTime = data.endTime;
            const tempFullDate=bookingTime.split("-");
            const fullDate=tempFullDate[0]+tempFullDate[1]+tempFullDate[2];
            const tempStartTime=startTime.split(":");
            const fullStartTime=tempStartTime[0]+tempStartTime[1]+"00000";
            const tempEndTime=endTime.split(":");
            const fullEndTime=tempEndTime[0]+tempEndTime[1]+"00000";

            await db.ref('Booking').child(data.id).set({
                date: fullDate,
                roomName: data.roomName,
                startTime: fullStartTime,
                endTime: fullEndTime,
                reason: data.reason,
                status: data.status,
                userId: data.userId,
                id: data.id //to update or tracking data
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //send noti to user
                    notification.sendMessage({
                        message: 'Your request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime + ' to ' + data.endTime,
                        receiver: data.id?.split('-')[0] || ' ',
                        sender: 'admin',
                        sendAt: fullTime,
                        isRead: false,
                        typeRequest: 'bookRoomRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                        id: data.id,
                        status: data.status
                    });
                    //gửi cho admin
                    notification.sendMessage({
                        message: ' sent a request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime + ' to ' + data.endTime,
                        receiver: "admin",
                        sender: data.userId,
                        sendAt: fullTime,
                        isRead: false,
                        typeRequest: 'bookRoomRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                        id: data.id,
                        status: data.status
                    });
                }
            });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }

}
