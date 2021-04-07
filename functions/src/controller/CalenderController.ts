import * as express from 'express';
import { Calendar, calendarSchema } from '../model/Calendar'
import auth from './Authenticate';
import { userSchema } from '../model/UserModel'

export default class CalendarController {
    router = express.Router();
    url = "/calendar";
    constructor() {
        this.init();
    }

    init() {
        this.router.get(this.url, auth, this.viewCalendar);
        this.router.post(this.url + '/add', auth, this.addSchedule);
        this.router.get(this.url + '/:id', auth, this.getSchedules);
        this.router.put(this.url + '/:id', auth, this.editSchedule);
        this.router.delete(this.url + '/:id', auth, this.editSchedule);
    }

    viewCalendar = async (request: express.Request, response: express.Response) => {
        const isCurrentUser = request.query.currentUser;
        const selectedRooms = request.query.rooms;
        const selectedDate = request.query.dates;
        const result: any[] = [];
        if (selectedDate) {
            const dates = selectedDate.toString().split(',');
            const promise = dates.map(date => { return calendarSchema.child(date).once('value', snap => snap) });
            const snaps = await Promise.all(promise);
            //Chỉ hiện các sự kiện của người dùng hiện tại
            if (isCurrentUser?.toString() === '1') {
                const userId = response.locals.employeeId;
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    snaps.forEach(snap => {
                        result.push((Object.values(snap.val())).filter(val => {
                            return (!(val as Calendar).isDone && rooms.includes((val as Calendar).room) && (val as Calendar).userId === userId)
                        }));
                    });
                } else {
                    snaps.forEach(snap => {
                        result.push((Object.values(snap.val())).filter(val => {
                            return (!(val as Calendar).isDone && (val as Calendar).userId === userId)
                        }));
                    });
                }
            }
            //Hiển thị tất cả các sự kiện trong lịch
            else {
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    snaps.forEach(snap => {
                        result.push((Object.values(snap.val())).filter(val => {
                            return (!(val as Calendar).isDone && rooms.includes((val as Calendar).room))
                        }));
                    });
                } else {
                    snaps.forEach(snap => {
                        !(snap.val() as Calendar).isDone ? result.push(Object.values(snap.val())) : '';
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
                        (Object.values(vals)).forEach(val => {
                            if (!(val as Calendar).isDone && rooms.includes((val as Calendar).room) && (val as Calendar).userId === userId) {
                                result.push(val);
                            }
                        });
                    });
                } else {
                    calendarSchema.on('child_added', async snap => {
                        const vals = Object.values(snap.val());
                        vals.forEach(val => {
                            if (!(val as Calendar).isDone && (val as Calendar).userId === userId) {
                                result.push(val);
                            }
                        });
                    });
                }
            }
            else {
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    calendarSchema.on('child_added', async snap => {
                        const vals = snap.val();
                        (Object.values(vals)).forEach(val => {
                            if (!(val as Calendar).isDone && rooms.includes((val as Calendar).room)) {
                                result.push(val);
                            }
                        });
                    });
                } else {
                    await calendarSchema.once('value', async snap => {
                        Object.values(snap.val()).forEach(val => result.push(Object.values(val as Calendar)));
                    });
                }
            }
        }
        return response.send(result);
    }

    addSchedule = async (request: express.Request, response: express.Response) => {
        try {
            const data: Calendar = request.body;
            const reqFrom = parseInt(data.from);
            const reqTo = parseInt(data.to);
            let isOcc: boolean = false;
            if (!(await userSchema.child(data.userId).get()).exists()) {
                return response.status(500).send('Sai uid');
            }
            // const test = new Date(parseInt(data.date.slice(0, 4)), parseInt(data.date.slice(4, 6)) - 1, parseInt(data.date.slice(6, 8)));
            calendarSchema.child(data.date).on('child_added', snap => {
                const value: Calendar = snap.val();
                const from = parseInt(value.from);
                const to = parseInt(value.to);
                if (!value.isDone && value.date === data.date && value.room === data.room) {
                    if (reqFrom === from || reqTo === to) {
                        isOcc = true;
                    } else if (reqFrom > from && reqFrom < to) {
                        isOcc = true;
                    } else if (reqTo > from && reqTo < to) {
                        isOcc = true;
                    }
                }
            });
            if (!isOcc) {
                calendarSchema.child(data.date).child(data.room.concat('-', data.from, '-', data.to)).set(data);
                response.status(200).send('ok');
            } else {
                response.status(400).send('Lich kin roi');
            }
        } catch (error) {
            response.status(500).send(error);
        }
    }

    editSchedule = async (request: express.Request, response: express.Response) => {
        try {
            const id = request.params.id;
            const data: Calendar = request.body;
            await calendarSchema.child(id).update({ isDone: true });
            await calendarSchema.child(data.room + "-" + data.from + "-" + data.to).set(data);
            response.status(200).send('ok');
        } catch (error) {
            response.status(500).send(error);
        }
    }

    deleteSchedule = async (request: express.Request, response: express.Response) => {
        try {
            const id = request.params.id;
            await calendarSchema.child(id).update({ isDone: true });
            response.status(200).send('ok');
        } catch (error) {
            response.status(500).send(error);
        }
    }

    getSchedules = async (request: express.Request, response: express.Response) => {
        try {
            const id = request.params.id;
            const result = (await calendarSchema.child(id).get()).val() as Calendar;
            !result.isDone ? response.status(200).json(result) : response.status(400).json({ error: "da xoa roi" });
        } catch (error) {
            response.status(500).send(error);
        }
    }
}