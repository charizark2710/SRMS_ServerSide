import * as express from 'express';
import { db } from "../connector/configFireBase"
import notification from './NotificationManagement'

export class BookRoomController {
    public router = express.Router();
    path = '/bookRoom'
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.path, this.createBookingRoom);
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
            const date = new Date();
            const fullDate = date.getFullYear().toString().concat(date.getMonth().toString(), date.getDate().toString(), '-', date.getHours().toString(), date.getMinutes().toString(), date.getSeconds().toString(), date.getMilliseconds().toString());
            const id = data.userId.toString() + '_' + fullDate;//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết
            await db.ref('Booking').child(id)
                .set({
                    date: data.date,
                    roomName: data.roomName,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    reason: data.reason,
                    status: data.status,
                    userId: data.userId,
                    id: id //to update or tracking data
                }, async (error) => {
                    if (error) {
                        response.status(500).send(error);
                    } else {
                        //gửi cho admin
                        notification.sendMessage({
                            message: ' sent a request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime + ' to ' + data.endTime,
                            receiver: "admin",
                            sender: data.userId,
                            sendAt: fullDate,
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
                            sendAt: fullDate,
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
            await db.ref('Booking').child(data.id).update({
                status: data.status,
            }, async (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    const date = new Date();
                    //send noti to user
                    notification.sendMessage({
                        message: 'Your requset to book room ' + data.roomName + ' at ' + data.date + ' ' + data.time,
                        receiver: data.id?.split('_')[0] || ' ',
                        sender: 'admin', 
                        sendAt: `${date.getFullYear().toString()}${date.getMonth().toString()}${date.getDate().toString()}-${date.getHours().toString()}${date.getMinutes().toString()}${date.getSeconds().toString()}${date.getMilliseconds().toString()}`,
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

    cancelBookingRoom = async (request: express.Request, response: express.Response) => {
        try {
            const bookingId = request.params.id;
            const userId = bookingId?.split('_')[0] || ' ';
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
            await db.ref('Booking').child(data.id).set({
                date: data.date,
                roomName: data.roomName,
                startTime: data.startTime,
                endTime: data.endTime,
                reason: data.reason,
                status: data.status,
                userId: data.userId,
                id: data.id //to update or tracking data
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    const date = new Date()
                    //send noti to user
                    notification.sendMessage({
                        message: 'Your request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime + ' to ' + data.endTime,
                        receiver: data.id?.split('_')[0] || ' ',
                        sender: 'admin', 
                        sendAt: `${date.getFullYear().toString()}${date.getMonth().toString()}${date.getDate().toString()}-${date.getHours().toString()}${date.getMinutes().toString()}${date.getSeconds().toString()}${date.getMilliseconds().toString()}`,
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
                        sendAt: `${date.getFullYear().toString()}${date.getMonth().toString()}${date.getDate().toString()}-${date.getHours().toString()}${date.getMinutes().toString()}${date.getSeconds().toString()}${date.getMilliseconds().toString()}`,
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
