import * as express from 'express';
import { Calendar, calendarSchema } from '../model/Calendar'
import auth from './Authenticate';
import { userSchema } from '../model/UserModel'
import { db, adminAuth } from '../connector/configFireBase'
import notification from './NotificationManagement'

export default class CalendarController {
    router = express.Router();
    url = "/calendar";
    constructor() {
        this.init();
    }

    init() {
        this.router.get(this.url, auth, this.viewCalendar);
        this.router.post(this.url + '/add', auth, this.addSchedule);
        this.router.post(this.url, auth, this.importCalendar);
        this.router.get(this.url + '/:id', auth, this.getSchedules);
        this.router.put(this.url + '/:id', auth, this.editSchedule);
    }

    viewCalendar = async (request: express.Request, response: express.Response) => {
        const isCurrentUser = request.query.currentUser;
        const selectedRooms = request.query.rooms;
        const selectedDate = request.query.dates;
        const result: Calendar[] = [];
        if (selectedDate) {
            const dates = selectedDate.toString().split(',');
            const promise = dates.map(date => { return calendarSchema.child(date).orderByChild('isDone').equalTo(false).once('value', snap => snap) });
            const snaps = await Promise.all(promise);
            //Chỉ hiện các sự kiện của người dùng hiện tại
            if (isCurrentUser?.toString() === '1') {
                const userId = response.locals.employeeId;
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    snaps.forEach(snap => {
                        if (snap.val()) {
                            (Object.values(snap.val())).forEach(val => {
                                if (rooms.includes((val as Calendar).room) && (val as Calendar).userId === userId) {
                                    result.push(val as Calendar);
                                }
                            });
                        }
                    });
                } else {
                    snaps.forEach(snap => {
                        if (snap.val()) {
                            Object.values(snap.val()).forEach(val => {
                                if ((val as Calendar).userId === userId) {
                                    result.push(val as Calendar);
                                }
                            });
                        }
                    });
                }
            }
            //Hiển thị tất cả các sự kiện trong lịch
            else {
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    snaps.forEach(snap => {
                        if (snap.val()) {
                            (Object.values(snap.val())).forEach(val => {
                                if (rooms.includes((val as Calendar).room)) {
                                    result.push(val as Calendar);
                                }
                            });
                        }
                    });
                } else {
                    snaps.forEach(snap => {
                        if (snap.val()) {
                            Object.values(snap.val()).forEach(val => {
                                result.push(val as Calendar);
                            });
                        }
                    });
                }
            }
        } else {
            if (isCurrentUser?.toString() === '1') {
                const userId = response.locals.employeeId;
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    calendarSchema.on('child_added', async snap => {
                        const vals = snap.val();
                        if (vals) {
                            (Object.values(vals)).forEach(val => {
                                if (!(val as Calendar).isDone && rooms.includes((val as Calendar).room) && (val as Calendar).userId === userId) {
                                    result.push(val as Calendar);
                                }
                            });
                        }
                    });
                } else {
                    calendarSchema.on('child_added', async snap => {
                        if (snap.val()) {
                            const vals = Object.values(snap.val());
                            vals.forEach(val => {
                                if (!(val as Calendar).isDone && (val as Calendar).userId === userId) {
                                    result.push(val as Calendar);
                                }
                            });
                        }
                    });
                }
            }
            else {
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    calendarSchema.on('child_added', async snap => {
                        const vals = snap.val();
                        if (vals) {
                            (Object.values(vals)).forEach(val => {
                                if (!(val as Calendar).isDone && rooms.includes((val as Calendar).room)) {
                                    result.push(val as Calendar);
                                }
                            });
                        }
                    });
                } else {
                    await calendarSchema.once('value', async snap => {
                        if (snap.val()) {
                            Object.values(snap.val()).forEach((val: any) => {
                                Object.values(val).forEach((res: any) => {
                                    if (!res.isDone) {
                                        result.push(res);
                                    }
                                })
                            });
                        }
                    });
                }
            }
        }
        return response.send(result);
    }

    addSchedule = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const reqFrom = parseInt(data.from);
            const reqTo = parseInt(data.to);
            let isOcc: boolean = false;
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

            if (!(await userSchema.child(data.userId).get()).exists()) {
                return response.status(500).send('Sai uid');
            }

            const bookValue = (await db.ref('booking').child(data.id).get()).val();

            if (data.status === "accepted") {
                // const test = new Date(parseInt(data.date.slice(0, 4)), parseInt(data.date.slice(4, 6)) - 1, parseInt(data.date.slice(6, 8)));
                isOcc = (await calendarSchema.child(bookValue.date).get()).forEach(snap => {
                    const value: Calendar = snap.val();
                    const from = parseInt(value.from);
                    const to = parseInt(value.to);
                    if (!value.isDone) {
                        if (data.userId === value.userId) return true;
                        if (value.date === bookValue.date && value.room === bookValue.roomName) {
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
                    await calendarSchema.child(bookValue.date).child(data.room.concat('-', bookValue.startTime, '-', bookValue.endTime)).set({
                        date: bookValue.date,
                        from: bookValue.startTime,
                        isDone: false,
                        reason: bookValue.reason,
                        to: bookValue.endTime,
                        userId: data.userId,
                        room: data.room
                    });
                    await db.ref('booking').child(data.id).update({
                        status: data.status,
                    });
                    notification.sendMessage({
                        message: 'Your request to control room' + data.room + ' is ' + data.status,
                        receiver: data.userId,
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                    });
                    response.status(200).send('ok');
                } else {
                    response.status(400).json('Lich kin roi');
                }
            } else {
                notification.sendMessage({
                    message: 'Your request to control room' + data.room + ' is ' + data.status,
                    receiver: data.userId,
                    sender: "admin",
                    sendAt: fullTime,
                    isRead: false,
                    id: id,
                });
                response.status(200).send('ok');
            }
        } catch (error) {
            response.status(500).json(error);
        }
    }


    editSchedule = async (request: express.Request, response: express.Response) => {
        try {
            const id = request.params.id;
            const date = request.query.date;
            const data: Calendar = request.body;
            const reqFrom = parseInt(data.from);
            const reqTo = parseInt(data.to);
            let isOcc: boolean = false;
            isOcc = (await calendarSchema.child(data.date).get()).forEach(snap => {
                const value: Calendar = snap.val();
                const from = parseInt(value.from);
                const to = parseInt(value.to);
                if (!value.isDone) {
                    if (value.date === data.date && value.room === data.room) {
                        if (reqFrom === from || reqTo === to) {
                            return true;
                        } else if (reqFrom > from && reqFrom < to) {
                            return true;
                        } else if (reqTo > from && reqTo < to) {
                            return true;
                        }
                    }
                }
            });
            if (!isOcc) {
                data.isDone = false;
                calendarSchema.child(data.date).child(data.room.concat('-', data.from, '-', data.to)).set(data);
                await calendarSchema.child(date as string).child(id).update({ isDone: true });
                const uid = (await userSchema.child(data.userId).get()).val()['uid'];
                adminAuth.setCustomUserClaims(uid, { room: data.room });
                response.status(200).send('ok');
            } else {
                response.status(400).send('Lich kin roi');
            }
        } catch (error) {
            response.status(500).send(error);
        }
    }

    deleteSchedule = async (request: express.Request, response: express.Response) => {
        try {
            const date = request.query.date;
            const id = request.params.id;
            if (date) {
                const calendar: Calendar = (await calendarSchema.child(date as string).child(id).get()).val();
                const uid = (await userSchema.child(calendar.userId).get()).val()['uid'];
                adminAuth.setCustomUserClaims(uid, { room: null });
                await calendarSchema.child(date as string).child(id).update({ isDone: true });
                response.status(200).send('ok');
            }
        } catch (error) {
            response.status(500).send(error);
        }
    }

    getSchedules = async (request: express.Request, response: express.Response) => {
        try {
            const date = request.query.date;
            const id = request.params.id;
            if (date) {
                const result = (await calendarSchema.child(date as string).child(id).get()).val() as Calendar;
                !result.isDone ? response.status(200).json(result) : response.status(400).json({ error: "da xoa roi" });
            }
        } catch (error) {
            response.status(500).send(error);
        }
    }

    importCalendar = async (request: express.Request, response: express.Response) => {
        try {
            const calendars: Calendar[] = request.body;

            for (let i = 0; i < calendars.length; i++) {
                let data: Calendar = {
                    date: calendars[i].date.toString(),
                    from: calendars[i].from.toString(),
                    to: calendars[i].to.toString(),
                    isDone: false,
                    reason: calendars[i].reason,
                    room: calendars[i].room.toString(),
                    userId: calendars[i].userId,
                    userName: calendars[i].userName,
                }

                const reqFrom = parseInt(data.from);
                const reqTo = parseInt(data.to);
                let isOcc: boolean = false;
                // if (!(await userSchema.child(data.userId).get()).exists()) {
                //     return response.status(500).send('Sai uid');
                // }
                // const test = new Date(parseInt(data.date.slice(0, 4)), parseInt(data.date.slice(4, 6)) - 1, parseInt(data.date.slice(6, 8)));
                isOcc = (await calendarSchema.child(data.date).get()).forEach(snap => {
                    const value: Calendar = snap.val();
                    const from = parseInt(value.from);
                    const to = parseInt(value.to);
                    if (!value.isDone) {
                        if (value.date === data.date && value.room === data.room) {
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
                    calendarSchema.child(data.date).child(data.room.concat('-', data.from, '-', data.to)).set(data);
                }
            }
            return response.status(200).json(calendars.length);

        } catch (error) {
            response.status(500).json(error);
        }
    }


}