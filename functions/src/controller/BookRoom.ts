import { userSchema } from '../model/UserModel'
import * as express from 'express';
import { db, adminAuth } from "../connector/configFireBase"
import bycrypt from 'bcryptjs'
import auth from './Authenticate';
import authorized from './Authorized';
import notification from './NotificationManagement'

export class BookRoom {
    public router = express.Router();
    path = '/bookRoom'
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.path, this.createBookingRoom);
        this.router.delete(this.path + "/delete/:id", this.cancelBookingRoom);
        this.router.patch(this.path + "/acceptOrRejectBooking", this.acceptOrRejectBooking);
        this.router.put(this.path + "/updating", this.updateBooking);
        this.router.get(this.path + '/:id', this.viewDetailBookingRoom);
        this.router.get(this.path + '/editting/:id', this.getBookingById);
    }

    //save booking
    createBookingRoom = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const date = new Date();
            const fullDate = date.getFullYear().toString().concat(date.getMonth().toString(), date.getDate().toString(), '-', date.getHours().toString(),date.getMinutes().toString(), date.getSeconds().toString());
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
                }, (error) => {
                    if (error) {
                        response.status(500).send(error);
                    } else {
                        //gửi cho admin
                        notification.sendMessage({
                            message: ' sent a request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime + ' to ' + data.endTime,
                            receiver: "thanhntse63563",//fake account admin
                            sender: data.userId,
                            sendAt: (new Date()).toString(),
                            isRead: false,
                            typeRequest: 'bookRoomRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                            id: id,
                            status: data.status,
                        });
                        //gửi cho chính user đặt phòng
                        notification.sendMessage({
                            message: 'Your request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime + ' to ' + data.endTime,
                            receiver: data.userId,
                            sender: "thanhntse63563",//fake account admin
                            sendAt: (new Date()).toString(),
                            isRead: false,
                            typeRequest: 'bookRoomRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                            id: id,
                            status: data.status,
                            
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
            var result = {};
            var id = request.params.id;
            notification.updateIsRead(id);
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


    //update trong booking noti user noti admin
    acceptOrRejectBooking = async (request: express.Request, response: express.Response) => {
        try {
            var data = request.body;//id + status
            await db.ref('Booking').child(data.id).update({
                status: data.status,
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {
                    //send noti to user
                    notification.updateAdminApprovalStatus(data.id, data.status, data.id?.split('_')[0] || ' ',(new Date()).toString());
                }
            });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }

    //from date, startTime, endTime =>
    //arr1: get rooms from lecture schedule
    //arr2: get rooms from booking schedule
    //arr3: arr1 union arr2
    //arr4: get all rooms
    //arr5: return arr4-arr3 
    getEmptyRooms = async (request: express.Request, response: express.Response) => {
        try {
            var data = request.body;

            var lectureSchedules = ['201', '202']; //example
            var bookingSchedules = await db.ref('Booking').child(data.date).once('value')
                .then(function (snapshot) {
                    //return snapshot.getKey();
                })


            await db.ref('Booking').child(data.date).child(data.roomName).child(data.startTime + '-' + data.endTime)
                .set({
                    reason: data.reason,
                    status: data.status,
                    userId: data.userId
                })




            return response.send("ok");
        } catch (error) {
            response.status(500).send(error);
        }
    }

    cancelBookingRoom = async (request: express.Request, response: express.Response) => {
        try {
            var bookingId = request.params.id;
            var userId = bookingId?.split('_')[0] || ' ';
            //xóa trong booking, xóa hết noti
            await db.ref('Booking').child(bookingId).remove()
                .then(function () {
                    //xoa noti user
                    db.ref('notification').child(userId).child(bookingId.toString()).remove();
                    //xoa noti admin
                    db.ref('notification').child('thanhntse63563').child(bookingId.toString()).remove();
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
            var result;
            var id = request.params.id;
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
            var data = request.body;
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
                    //send noti to user
                    notification.sendMessage({
                        message: 'Your request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime+' to '+data.endTime,
                        receiver: data.id?.split('_')[0] || ' ',
                        sender: 'thanhntse63563', //fake account admin
                        sendAt: (new Date()).toString(),
                        isRead: false,
                        typeRequest: 'bookRoomRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                        id: data.id,
                        status: data.status,

                    });
                    //gửi cho admin
                    notification.sendMessage({
                        message: ' sent a request to book room ' + data.roomName + ' at ' + data.date + ' from ' + data.startTime + ' to ' + data.endTime,
                        receiver: "thanhntse63563",//fake account admin
                        sender: data.userId,
                        sendAt: (new Date()).toString(),
                        isRead: false,
                        typeRequest: 'bookRoomRequest',//có 3 loại, dựa vào typeRequest để truy cập đúng bảng
                        id: data.id,
                        status: data.status,

                    });
                }
            });
            return response.status(200).json('ok');
        } catch (err) {
            response.status(500).send(err);
        }
    }

}
