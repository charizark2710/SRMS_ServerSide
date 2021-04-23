import * as express from 'express';
import { db } from "../connector/configFireBase"
import notification from './NotificationManagement'
import auth from './Authenticate';
import { Calendar, calendarSchema } from '../model/Calendar';
import { BookingRoom } from '../model/BookingRoom';
import getUTC from '../common/formatDate'

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
            const id = data.userId.toString() + '-' + fullTime;//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết

            //format lại ngày, thời gian bắt đầu, kết thúc theo lịch đặt của user
            const bookingTime = data.date;
            const startTime = data.startTime;
            const endTime = data.endTime;
            const tempFullDate = bookingTime.split("-");
            const fullDate = tempFullDate[0] + tempFullDate[1] + tempFullDate[2];
            const tempStartTime = startTime.split(":");
            const fullStartTime = tempStartTime[0] + tempStartTime[1] + "00000";
            const tempEndTime = endTime.split(":");
            const fullEndTime = tempEndTime[0] + tempEndTime[1] + "00000";

            await db.ref('booking').child(id)
                .set({
                    date: fullDate,
                    roomName: data.roomName,
                    startTime: fullStartTime,
                    endTime: fullEndTime,
                    reason: data.reason,
                    status: "pending",
                    actionNotiId: id
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
                            id: id,
                            url: "/bookRoomRequest/" + id,
                        });
                        //gửi cho chính user đặt phòng
                        notification.sendMessage({
                            message: 'Sending request to book room ' + data.roomName + ' at ' + data.date + ' ' + data.startTime + '-' + data.endTime + " successfully",
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
            db.ref('notification').child('admin').child(id.toString()).update({
                isRead: true
            });
            await db.ref('booking').child(id).get().then(function (snapshot) {
                if (snapshot.exists()) {
                    result = snapshot.val();
                    result["userId"] = id?.split("-")[0];
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
            const userId = bookingId?.split('-')[0] || ' ';
            const fullTime = getUTC(new Date());
            const id = userId.toString() + '-' + fullTime;

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
                        await db.ref('booking').child(bookingId).get().then(snap => {
                            let value = snap.val();
                            calendarId = value.date + "/" + value.roomName + "-" + value.startTime + "-" + value.endTime;
                        });
                        console.log(calendarId);

                        if (calendarId) {
                            calendarSchema.child(calendarId).update({ isDone: true });
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
            const bookingTime = data.date;
            const startTime = data.startTime;
            const endTime = data.endTime;
            const tempFullDate = bookingTime.split("-");
            const fullDate = tempFullDate[0] + tempFullDate[1] + tempFullDate[2];
            const tempStartTime = startTime.split(":");
            const fullStartTime = tempStartTime[0] + tempStartTime[1] + "00000";
            const tempEndTime = endTime.split(":");
            const fullEndTime = tempEndTime[0] + tempEndTime[1] + "00000";
            const id = data.id?.split('-')[0].toString() + '-' + fullTime;

            await db.ref('booking').child(data.id).update({
                date: fullDate,
                roomName: data.roomName,
                startTime: fullStartTime,
                endTime: fullEndTime,
                reason: data.reason,
                actionNotiId: id,
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
            let fullDate: string = '', reqStartTime: number, reqEndTime: number, busyRoom: any[] = [], allRooms: any[] = [], result: any[] = []
            const date = request.query.date?.toString();
            const qstartTime = request.query.startTime?.toString();
            const qendTime = request.query.endTime?.toString();

            const tempFullDate = date?.split("-");
            if (tempFullDate) {
                fullDate = tempFullDate[0] + tempFullDate[1] + tempFullDate[2];
            }
            const tempStartTime = qstartTime?.split(":");
            if (tempStartTime) {
                let fullStartTime = tempStartTime[0] + tempStartTime[1] + "00000";
                reqStartTime = parseInt(fullStartTime)
            }
            const tempEndTime = qendTime?.split(":");
            if (tempEndTime) {
                let fullEndTime = tempEndTime[0] + tempEndTime[1] + "00000";
                reqEndTime = parseInt(fullEndTime)
            }


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

            busyRoom.forEach(x => {
                console.log("busy :" + x);
            })
            console.log("length: " + busyRoom.length);
            allRooms.forEach(x => {
                console.log("all :" + x);

            })
            result.forEach(x => {
                console.log("result :" + x);

            })

            return response.status(200).json(result);
        } catch (err) {
            response.status(500).send(err);
        }
    }
}
