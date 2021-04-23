import * as express from 'express';
import { db, adminAuth } from '../connector/configFireBase'
import notification from './NotificationManagement'
import auth from './Authenticate';
import { roomPermission } from './Authorized';
import { Calendar, calendarSchema } from '../model/Calendar'
import { userSchema } from '../model/UserModel'
import getUTC from '../common/formatDate'

export class ChangeRoomController {
    public router = express.Router();
    path = '/changeRoom'
    constructor() {
        this.init();
    }

    init() {
        this.router.get(this.path + '/getCurrentRoom', auth, roomPermission(), this.getCurrentRoom);
        this.router.post(this.path + '/sendChangeRoomRequest', auth, roomPermission(), this.sendChangeRoomRequest);
        this.router.put(this.path + '/sendChangeRoomRequest', auth, roomPermission(), this.acceptChangeRoomRequest);
    }

    getCurrentRoom = async (request: express.Request, response: express.Response) => {
        try {
            let result: any = {};

            const tempFullTime = getUTC(new Date()).split('-');
            const fullTime = parseInt(tempFullTime[1]);
            const room = response.locals.room;
            const snap = await calendarSchema.child(tempFullTime[0]).orderByKey().startAt(room + " ").endAt(room + "~").get();
            for (let value of Object.values(snap.val())) {
                if ((value as any).userId === response.locals.employeeId) {
                    const from = parseInt((value as any).from);
                    const to = parseInt((value as any).to);
                    if (fullTime >= from && fullTime <= to && !(value as any).isDone) {
                        console.log('ok rồi');
                        result = {
                            id: snap.key,
                            room: (value as any).room,
                            from: (value as any).from,
                            date: (value as any).date,
                            to: (value as any).to,
                        }
                        break;
                    }
                }
            }
            console.log('result: ' + JSON.stringify(result));
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

            const fullTime = getUTC(new Date());
            const id = data.userId.toString() + '-' + fullTime;//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết

            const changeDate = data.date;
            const tempFullDate = changeDate.split("-");
            const currentDate = tempFullDate[0] + tempFullDate[1] + tempFullDate[2];

            await calendarSchema.child(currentDate).child(data.calendarId).get().then(async (snapshot) => {
                if (snapshot.exists()) {
                    await calendarSchema.child(currentDate).child(data.calendarId).update({ reason: data.reasonToChange });
                    let currentBookingId;
                    const snapShotValue = snapshot.val();

                    (await db.ref('booking').get()).forEach((snap: any) => {
                        const snapValue = snap.val();
                        if (snapValue.startTime === snapShotValue.from && snapValue.endTime === snapShotValue.to &&
                            snapValue.date === snapShotValue.date && snapValue.status === "accepted" &&
                            snapValue.roomName === snapShotValue.room && snap.key.split("-")[0] === snapShotValue.userId) {
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
            const fullTime = getUTC(new Date());
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
                const valFrom = parseInt(value.from);
                const valTo = parseInt(value.to);
                if (!value.isDone) {
                    if (value.date === fullDate && value.room === data.newRoom) {
                        if (reqFrom === valFrom || reqTo === valTo) {
                            return true;
                        } else if (reqFrom > valFrom && reqFrom < valTo) {
                            return true;
                        } else if (reqTo > valFrom && reqTo < valTo) {
                            return true;
                        } else if (reqFrom < valFrom && reqTo > valTo) {
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
                        }, async (error) => {
                            if (error) {
                                response.status(400).send(error);
                            } else {
                                //4.1 update room trong booking
                                let currentBookingId;

                                (await db.ref('booking').get()).forEach((snap: any) => {
                                    const snapValue = snap.val();
                                    if (snapValue.startTime === reqFrom && snapValue.endTime === reqTo &&
                                        snapValue.date === fullDate && snapValue.status === "changing" &&
                                        snapValue.roomName === data.room && snap.key.split("-")[0] === userId) {
                                        currentBookingId = snap.key;
                                        return;
                                    }
                                })
                                if (currentBookingId) {
                                    await db.ref('booking').child(currentBookingId).update({
                                        roomName: data.newRoom,
                                        status: "accepted"
                                    });
                                }

                                const uid = (await userSchema.child(data.userId).get()).val()['uid'];
                                adminAuth.setCustomUserClaims(uid, { ...(await adminAuth.getUser(uid)).customClaims, room: data.newRoom });

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
                    response.status(500).json(error);
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
