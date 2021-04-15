import * as express from 'express';
import { db } from "../connector/configFireBase"
import notification from './NotificationManagement'
import auth from './Authenticate';
import authorized from './Authorized';
import { parse } from 'cookie';

import { Calendar, calendarSchema } from '../model/Calendar'


export class ChangeRoomController {
    public router = express.Router();
    path = '/changeRoom'
    constructor() {
        this.init();
    }

    init() {
        this.router.get(this.path + '/getCurrentRoom', auth, this.getCurrentRoom);
        this.router.post(this.path + '/sendChangeRoomRequest', auth, this.sendChangeRoomRequest);
        this.router.put(this.path + '/acceptChangeRoomRequest', auth, this.acceptChangeRoomRequest);

    }

    getCurrentRoom = async (request: express.Request, response: express.Response) => {
        try {
            let result: any = {};
            const currentUser = response.locals.employeeId;

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
            const fullDate = year.concat(month, date);
            const tempFullTime = hours.concat(min, sec, '000');
            const fullTime = parseInt(tempFullTime);


            (await calendarSchema.child(fullDate).get()).forEach(snapshot => {
                // if (snapshot.key == fullDate) {
                if (snapshot) {
                    let value = snapshot.val();
                    // console.log(snap);
                    //tìm room hiện tại của current user
                    if (value.userId == currentUser) {
                        let from = parseInt(value.from)
                        let to = parseInt(value.to)
                        if (fullTime >= from && fullTime <= to && !value.isDone) {
                            result = {
                                id: snapshot.key,
                                room: value.room,
                                from: value.from,
                                date: value.date,
                                to: value.to,
                            }
                        }
                    }

                }

            }
                // }
            )

            return response.status(200).json(result);
        } catch (error) {
            response.status(500).send(error);
        }
    }

    //(1)date, start, end, room , accepted=> booking
    //lấy phòng +key
    //gửi lại admin cái key, userId...tạo noti =>admin click vô noti, cầm cái key load lên data. load luôn danh sách phòng trống.
    //admin accept => cầm cái key để cập nhật lại isdone=true, cập nhật lại booking (1)=> thêm mới calendar


    //1. send request to change room.
    sendChangeRoomRequest = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body; //id trong calendar, userId, room, date, reason

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

            const changeDate = data.date;
            const tempFullDate = changeDate.split("-");
            const currentDate = tempFullDate[0] + tempFullDate[1] + tempFullDate[2];

            await calendarSchema.child(currentDate).child(data.calendarId).get().then(async (snapshot) => {
                if (snapshot.exists()) {
                    await calendarSchema.child(currentDate).child(data.calendarId).update({ reason: data.reasonToChange });
                    let currentBookingId;
                    let snapShotValue = snapshot.val();

                    (await db.ref('booking').get()).forEach((snap: any) => {
                        let snapValue = snap.val();
                        if (snapValue.startTime == snapShotValue.from && snapValue.endTime == snapShotValue.to &&
                            snapValue.date == snapShotValue.date && snapValue.status == "accepted" &&
                            snapValue.roomName == snapShotValue.room && snap.key.split("-")[0] == snapShotValue.userId) {
                            currentBookingId = snap.key;
                            return true;
                        }
                    })
                    if (currentBookingId) {
                        db.ref('booking').child(currentBookingId).update({
                            status: "changing",
                        })
                    }
                } else {
                    console.log("No data available");
                }
            }).catch((error) => {
                console.error(error);
            });


            //gửi cho admin
            notification.sendMessage({
                message: ' sent a request to change room ' + data.room,
                receiver: "admin",
                sender: data.userId,
                sendAt: fullTime,
                isRead: false,
                id: id,
                url: "/changeRoomRequest/" + currentDate + "~" + data.calendarId,
                isValid: true,
            });
            //gửi cho chính user đổi phòng
            notification.sendMessage({
                message: 'Your request to change room ' + data.room + ' is being processed',
                receiver: data.userId,
                sender: "admin",
                sendAt: fullTime,
                isRead: false,
                id: id,
            });



            return response.status(200).json("ok");
        } catch (err) {
            response.status(500).send(err);
        }
    }


    //2. click vô noti, load data -> calendar controller

    //3. load phòng trống => bookroom controller

    //4. accept đổi phòng
    //4.1 update room trong booking
    //4.2 update isDone trong calendar
    //4.3 new mới trong calendar
    //4.4 noti

    acceptChangeRoomRequest = async (request: express.Request, response: express.Response) => {
        try {

            const data = request.body; //id trong calendar, userId, newRoom
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
            const id = data.userId.toString() + '-' + fullTime;

            //format lại ngày, thời gian bắt đầu, kết thúc theo lịch đặt của user
            const changeTime = data.date;
            const from = data.from;
            const to = data.to;
            const tempFullDate = changeTime.split("-");
            const fullDate = tempFullDate[0] + tempFullDate[1] + tempFullDate[2];
            const tempStartTime = from.split(":");
            const fullStartTime = tempStartTime[0] + tempStartTime[1] + "00000";
            const tempEndTime = to.split(":");
            const fullEndTime = tempEndTime[0] + tempEndTime[1] + "00000";


            let isOcc: boolean = false;
            const reqFrom = parseInt(fullStartTime);
            const reqTo = parseInt(fullEndTime);


            isOcc = (await calendarSchema.child(fullDate).get()).forEach(snap => {
                const value: Calendar = snap.val();
                const from = parseInt(value.from);
                const to = parseInt(value.to);
                if (!value.isDone) {
                    if (value.date === fullDate && value.room === data.newRoom) {
                        if (reqFrom === from || reqTo === to) {
                            return true;
                        } else if (reqFrom > from && reqFrom < to) {
                            return true;
                        } else if (reqTo > from && reqTo < to) {
                            return true;
                        } else if (reqFrom < from && reqTo > to) {
                            return true;
                        }
                    }
                }
            });
            if (!isOcc) {
                (calendarSchema.child(fullDate).child(data.calendarId)).get().then(async (snapshot) => {
                    if (snapshot.exists()) {
                        const val: Calendar = snapshot.val();
                        const userName = val.userName;
                        const userId = val.userId;

                        //4.2 update isDone trong calendar
                        await calendarSchema.child(fullDate).child(data.calendarId).update({
                            isDone: true
                        })
                        //4.3 new mới trong calendar
                        await calendarSchema.child(fullDate).child(data.newRoom.concat('-', reqFrom, '-', reqTo)).set({
                            date: val.date,
                            from: val.from,
                            to: val.to,
                            isDone: false,
                            reason: val.reason,
                            room: data.newRoom,
                            userId: userId,
                            userName: userName,
                        }, async(error) => {
                            if (error) {
                                response.status(400).send(error);
                            } else {
                                //4.1 update room trong booking
                                let currentBookingId;

                                (await db.ref('booking').get()).forEach((snap: any) => {
                                    let snapValue = snap.val();
                                    if (snapValue.startTime == reqFrom && snapValue.endTime == reqTo &&
                                        snapValue.date == fullDate && snapValue.status == "changing" &&
                                        snapValue.roomName == data.room && snap.key.split("-")[0] == userId) {
                                        currentBookingId = snap.key;
                                        return true;
                                    }
                                })
                                if (currentBookingId) {
                                    await db.ref('booking').child(currentBookingId).update({
                                        roomName: data.newRoom,
                                        status:"accepted"
                                    })
                                }
                                //4.4 gửi noti cho user
                                notification.sendMessage({
                                    message: 'You are accepted to change from ' + data.room + ' to ' + data.newRoom,
                                    receiver: userId,
                                    sender: "admin",
                                    sendAt: fullTime,
                                    isRead: false,
                                    id: id,
                                });
                            }
                        });




                    } else {
                        console.log("No data available");
                    }
                }).catch((error) => {
                    console.error(error);
                });
            } else {
                response.status(400).send('Lich kin roi');
            }

            response.status(200).json("ok");
        } catch (err) {
            response.status(500).send(err);
        }
    }



}
