import * as express from 'express';
import { Calendar, calendarSchema } from '../model/Calendar'
import auth from './Authenticate';
import { userSchema } from '../model/UserModel'
import { db, adminAuth } from '../connector/configFireBase'
import notification from './NotificationManagement'
import getUTC from '../common/formatDate'

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
            const fullTime = getUTC(new Date());
            const id = fullTime + '-' + data.userId.toString();
            let errorMessage: string = '';

            if (!(await userSchema.child(data.userId).get()).exists()) {
                return response.status(500).send('Sai uid');
            }
            if (data.status === "accepted") {
                // const test = new Date(parseInt(data.date.slice(0, 4)), parseInt(data.date.slice(4, 6)) - 1, parseInt(data.date.slice(6, 8)));
                isOcc = (await calendarSchema.child(data.date).get()).forEach(snap => {
                    const value = snap.val() as Calendar;
                    const from = parseInt(value.from);
                    const to = parseInt(value.to);
                    if (!value.isDone) {
                        if (value.room === data.room) {
                            if (reqFrom === from || reqTo === to) {
                                errorMessage = 'The schedule is full';
                                return true;
                            } else if (reqFrom > from && reqFrom < to) {
                                errorMessage = 'The schedule is full';
                                return true;
                            } else if (reqTo > from && reqTo < to) {
                                errorMessage = 'The schedule is full';
                                return true;
                            }
                        } else {
                            if (value.userId === data.userId) {
                                if (reqFrom === from || reqTo === to) {
                                    errorMessage = 'Cannot have 2 authenticate at the same time';
                                    return true;
                                } else if (reqFrom > from && reqFrom < to) {
                                    errorMessage = 'Cannot have 2 authenticate at the same time';
                                    return true;
                                } else if (reqTo > from && reqTo < to) {
                                    errorMessage = 'Cannot have 2 authenticate at the same time';
                                    return true;
                                }
                            }
                        }
                    }
                });

                if (!isOcc) {
                    calendarSchema.child(data.date).child(data.room.concat('-', data.from, '-', data.to)).set({
                        date: data.date,
                        from: data.from,
                        isDone: false,
                        reason: data.reason,
                        to: data.to,
                        userId: data.userId,
                        room: data.room
                    });
                    db.ref('booking').child(data.id).update({
                        status: data.status,
                        startTime: data.from
                    });
                    notification.sendMessage({
                        message: 'Your request to control room' + data.room + ' is ' + data.status,
                        receiver: data.userId,
                        sender: "admin",
                        sendAt: fullTime,
                        isRead: false,
                        id: id,
                        url: '/bookRoomRequest/' + id
                    });
                    response.status(200).send('ok');
                } else {
                    response.status(400).json(errorMessage);
                }
            } else {
                notification.sendMessage({
                    message: 'Your request to control room' + data.room + ' is ' + data.status,
                    receiver: data.userId,
                    sender: "admin",
                    sendAt: fullTime,
                    isRead: false,
                    id: id,
                    url: '/bookRoomRequest/' + id
                });
                await db.ref('booking').child(data.id).update({
                    status: data.status,
                });
                response.status(200).send('ok');
            }
        } catch (error) {
            console.log(error);
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
            let errorMessage: string = '';
            let isOcc: boolean = false;
            isOcc = (await calendarSchema.child(data.date).get()).forEach(snap => {
                const value = snap.val() as Calendar;
                const from = parseInt(value.from);
                const to = parseInt(value.to);
                if (!value.isDone) {
                    if (value.room === data.room) {
                        if (reqFrom === from || reqTo === to) {
                            errorMessage = 'The schedule is full';
                            return true;
                        } else if (reqFrom > from && reqFrom < to) {
                            errorMessage = 'The schedule is full';
                            return true;
                        } else if (reqTo > from && reqTo < to) {
                            errorMessage = 'The schedule is full';
                            return true;
                        }
                    } else {
                        if (value.userId === data.userId) {
                            if (reqFrom === from || reqTo === to) {
                                errorMessage = 'Cannot have 2 authenticate at the same time';
                                return true;
                            } else if (reqFrom > from && reqFrom < to) {
                                errorMessage = 'Cannot have 2 authenticate at the same time';
                                return true;
                            } else if (reqTo > from && reqTo < to) {
                                errorMessage = 'Cannot have 2 authenticate at the same time';
                                return true;
                            }
                        }
                    }
                }
            });
            if (!isOcc) {
                data.isDone = false;
                calendarSchema.child(data.date).child(data.room.concat('-', data.from, '-', data.to)).set(data);
                await calendarSchema.child(date as string).child(id).update({ isDone: true });
                const uid = (await userSchema.child(data.userId).get()).val()['uid'];
                adminAuth.setCustomUserClaims(uid, { ...(await adminAuth.getUser(uid)).customClaims, room: data.room });
                response.status(200).send('ok');
            } else {
                response.status(400).send(errorMessage);
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
            const notiId = request.query.notiId;
            if (date) {
                const result = (await calendarSchema.child(date as string).child(id).get()).val() as Calendar;
                notification.updateIsRead(notiId as string);
                response.status(200).json(result);
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