import * as express from 'express';
import { db } from "../connector/configFireBase"
import notification from './NotificationManagement'
import auth from './Authenticate';
import { Calendar, calendarSchema } from '../model/Calendar';
import { BookingRoom } from '../model/BookingRoom';
import getUTC, { formatTime, formatDate } from '../common/formatDate'

export class BookRoomController {
    public router = express.Router();
    path = '/bookRoom'
    constructor() {
        this.init();
    }

    init() {
        this.router.post(this.path + '/add', auth, this.createBookingRoom);
        this.router.patch(this.path + "/delete/:id", auth, this.cancelBookingRoom);
        this.router.put(this.path + "/update", auth, this.updateBooking);
        this.router.get(this.path + '/getAvailableRooms', auth, this.getAvailableRooms);
        this.router.get(this.path + '/:id', auth, this.viewDetailBookingRoom);
        this.router.get(this.path + '/edit/:id', auth, this.getBookingById);
    }

    //save booking
    createBookingRoom = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;

            //tạo ID
            const fullTime = getUTC(new Date());
            const id = fullTime + '-' + data.userId.toString();//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết

            //format lại ngày, thời gian bắt đầu, kết thúc theo lịch đặt của user
            const fullDate = data.date;
            const fullStartTime = data.startTime;
            const fullEndTime = data.endTime;

            await db.ref('booking').child(id)
                .set({
                    date: fullDate,
                    roomName: data.roomName,
                    startTime: fullStartTime,
                    endTime: fullEndTime,
                    reason: data.reason,
                    status: "pending",
                    userId: data.userId.toString()
                }, async (error) => {
                    if (error) {
                        response.status(500).send(error);
                    } else {
                        //gửi cho admin
                        notification.sendMessage({
                            message: ' sent a request to book room ' + data.roomName + ' at ' + formatDate(fullDate) + ' from ' + formatTime(data.startTime) + ' to ' + formatTime(data.endTime),
                            receiver: "admin",
                            sender: data.userId,
                            sendAt: fullTime,
                            isRead: false,
                            id: id,
                            url: "/bookRoomRequest/" + id,
                        });
                        //gửi cho chính user đặt phòng
                        notification.sendMessage({
                            message: 'Sending request to book room ' + data.roomName + ' at ' + formatDate(fullDate) + ' from ' + formatTime(data.startTime) + ' to ' + formatTime(data.endTime),
                            receiver: data.userId,
                            sender: "admin",
                            sendAt: fullTime,
                            isRead: false,
                            id: id,
                            url: "/bookRoomRequest/" + id,
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
            let result = {
                userId: "",
                roomName: "",
                date: "",
                startTime: "",
                endTine: "",
                reason: "",
                status: "",
            };
            const id = request.params.id;
            const notiId = request.query.notiId;
            db.ref('notification').child('admin').child(notiId as string).update({
                isRead: true
            });
            await db.ref('booking').child(id).get().then(function (snapshot) {
                if (snapshot.exists()) {
                    result = snapshot.val();
                    result["userId"] = id?.split("-")[2];
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


    cancelBookingRoom = async (request: express.Request, response: express.Response) => {
        try {
            const bookingId = request.params.id;
            const message = request.query.message;
            const status = request.query.status;
            const userId = bookingId?.split('-')[2] || ' ';
            const fullTime = getUTC(new Date());
            const id = fullTime + '-' + userId.toString();

            //nếu đổi phòng
            if (status === "changing") {
                await db.ref('booking').child(bookingId).update({
                    status: "accepted",
                }).then(function () {
                    //gửi cho admin
                    notification.sendMessage({
                        message: ' cancel changing ' + message,
                        receiver: "admin",
                        sender: userId,
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/bookRoomRequest/" + bookingId,
                    });
                    //gửi cho chính user đặt phòng
                    notification.sendMessage({
                        message: 'You canceled changing ' + message,
                        receiver: userId,
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/bookRoomRequest/" + bookingId,
                    });

                })
                    .catch(function (error) {
                        console.log("Cancel failed: " + error.message)
                    });
            } else {
                await db.ref('booking').child(bookingId).update({
                    status: "deleted",
                }).then(async () => {
                    //nếu đã accepted phải hủy trong calendar
                    if (status === "accepted") {
                        let calendarId;
                        const value = (await db.ref('booking').child(bookingId).get()).val();
                        calendarId = value.roomName + "-" + value.startTime + "-" + value.endTime;
                        console.log(calendarId);
                        if (calendarId) {
                            calendarSchema.child(value.date).child(calendarId).update({ isDone: true });
                        }
                    }

                    //gửi cho admin
                    notification.sendMessage({
                        message: ' cancel ' + message,
                        receiver: "admin",
                        sender: userId,
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/bookRoomRequest/" + bookingId,
                    });
                    //gửi cho chính user đặt phòng
                    notification.sendMessage({
                        message: 'You canceled ' + message,
                        receiver: userId,
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/bookRoomRequest/" + bookingId,
                    });
                })
                    .catch(function (error) {
                        console.log("Cancel failed: " + error.message)
                    });
            }
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
            await db.ref('booking').child(id).get().then(function (snapshot) {
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
            const fullTime = getUTC(new Date());

            //format lại ngày, thời gian bắt đầu, kết thúc theo lịch đặt của user
            const fullDate = data.date;
            const fullStartTime = data.startTime;
            const fullEndTime = data.endTime;
            const id = fullTime + '-' + data.id?.split('-')[0].toString();

            await db.ref('booking').child(data.id).update({
                date: fullDate,
                roomName: data.roomName,
                startTime: fullStartTime,
                endTime: fullEndTime,
                reason: data.reason,
                userId: data.id?.split('-')[0].toString(),
            }, (error) => {
                if (error) {
                    response.status(500).send(error);
                } else {

                    //gửi cho admin
                    notification.sendMessage({
                        message: ' changed a book room request to room ' + data.roomName + ' at ' + data.date + ' ' + data.startTime + '-' + data.endTime,
                        receiver: "admin",
                        sender: data.id?.split('-')[0] || ' ',
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: "/bookRoomRequest/" + data.id,
                    });
                    //gửi cho chính user đặt phòng
                    notification.sendMessage({
                        message: 'You changed a book room request to room ' + data.roomName + ' at ' + data.date + ' ' + data.startTime + '-' + data.endTime,
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

    getAvailableRooms = async (request: express.Request, response: express.Response) => {
        try {
            // let result;
            let busyRoom: any[] = [], allRooms: any[] = [], result: any[] = []
            const fullDate = request.query.date?.toString() as string;
            const reqStartTime = parseInt(request.query.startTime?.toString() as string);
            const reqEndTime = parseInt(request.query.endTime?.toString() as string);

            (await calendarSchema.child(fullDate).get()).forEach(snap => {
                const value: Calendar = snap.val();
                const from = parseInt(value.from);
                const to = parseInt(value.to);
                if (!value.isDone) {
                    if (value.date === fullDate) {
                        if (reqStartTime === from || reqEndTime === to) {
                            busyRoom.push(value.room)
                        } else if (reqStartTime > from && reqStartTime < to) {
                            busyRoom.push(value.room)
                        } else if (reqEndTime > from && reqEndTime < to) {
                            busyRoom.push(value.room)
                        }
                        else if (reqStartTime < from && reqEndTime > to) {
                            busyRoom.push(value.room)
                        }
                    }
                }
            });

            (await db.ref('booking').get()).forEach(snap => {
                const value: BookingRoom = snap.val();
                const startTime = parseInt(value.startTime);
                const endTime = parseInt(value.endTime);

                console.log(value.date === fullDate && value.status === "pending");

                if (value.date === fullDate && value.status === "pending") {
                    if (reqStartTime === startTime || reqEndTime === endTime) {
                        busyRoom.push(value.roomName)
                    } else if (reqStartTime > startTime && reqStartTime < endTime) {
                        busyRoom.push(value.roomName)
                    } else if (reqEndTime > startTime && reqEndTime < endTime) {
                        busyRoom.push(value.roomName)
                    }
                    else if (reqStartTime < startTime && reqEndTime > endTime) {
                        busyRoom.push(value.roomName)
                    }
                }
            });

            (await db.ref('room').get()).forEach(snap => {
                let room = snap.key;
                if (room) {
                    allRooms.push(room);
                }
            })

            result = allRooms.filter(x => !busyRoom.includes(x));

            return response.status(200).json(result);
        } catch (err) {
            response.status(500).send(err);
        }
    }
}
