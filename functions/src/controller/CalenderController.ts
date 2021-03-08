import * as express from 'express';
import { DynamicCalendar, calendarSchema } from '../model/Calendar'
import auth from './Authenticate';

export default class CalendarController {
    router = express.Router();
    url = "/calendar";
    constructor() {
        this.init();
    }

    init() {
        this.router.get(this.url + '/view', auth, this.viewCalendar);
        this.router.post(this.url + '/add', auth, this.addSchedule);
    }

    viewCalendar = async (request: express.Request, response: express.Response) => {
        const isCurrentUser = request.query.currentUser;
        const selectedRooms = request.query.rooms;
        const selectedDate = request.query.dates;
        const result: any[] = [];
        if (selectedDate) {
            const dates = selectedDate.toString().split(',');
            //Chỉ hiện các sự kiện của người dùng hiện tại
            if (isCurrentUser?.toString() === '1') {
                const userId = response.locals.employeeId;
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    for (const date of dates) {
                        (await calendarSchema.child('dynamic').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            for (const room of rooms) {
                                if (userId === val.userId && room === val.room) {
                                    result.push(val);
                                }
                            }
                        });
                        (await calendarSchema.child('static').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            for (const room of rooms) {
                                if (userId === val.userId && room === val.room) {
                                    result.push(val);
                                }
                            }
                        });
                    }
                } else {
                    for (const date of dates) {
                        (await calendarSchema.child('dynamic').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            if (userId === val.userId) {
                                result.push(val);
                            }
                        });
                        (await calendarSchema.child('static').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            if (userId === val.userId) {
                                result.push(val);
                            }
                        });
                    }
                }
            }
            //Hiển thị tất cả các sự kiện trong lịch
            else {
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    for (const date of dates) {
                        (await calendarSchema.child('dynamic').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            for (const room of rooms) {
                                if (room === val.room) {
                                    result.push(val);
                                }
                            }
                        });
                        (await calendarSchema.child('static').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            for (const room of rooms) {
                                if (room === val.room) {
                                    result.push(val);
                                }
                            }
                        });
                    }
                } else {
                    for (const date of dates) {
                        (await calendarSchema.child('dynamic').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            result.push(val);
                        });
                        (await calendarSchema.child('static').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            result.push(val);
                        });
                    }
                }
            }
        } else {
            if (isCurrentUser?.toString() === '1') {
                const userId = response.locals.employeeId;
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    rooms.forEach(async room => {
                        (await calendarSchema.child('dynamic').get()).forEach(snap => {
                            if (snap.val().userId === userId && snap.val().room === room) {
                                result.push(snap.val());
                            }
                        });
                        (await calendarSchema.child('static').get()).forEach(snap => {
                            if (snap.val().userId === userId && snap.val().room === room) {
                                result.push(snap.val());
                            }
                        });
                    });
                } else {
                    (await calendarSchema.child('dynamic').get()).forEach(snap => {
                        if (snap.val().userId === userId) {
                            result.push(snap.val());
                        }
                    });
                    (await calendarSchema.child('static').get()).forEach(snap => {
                        if (snap.val().userId === userId) {
                            result.push(snap.val());
                        }
                    });
                }
            } else {
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    rooms.forEach(async room => {
                        (await calendarSchema.child('dynamic').get()).forEach(snap => {
                            if (snap.val().room === room) {
                                result.push(snap.val());
                            }
                        });
                        (await calendarSchema.child('static').get()).forEach(snap => {
                            if (snap.val().room === room) {
                                result.push(snap.val());
                            }
                        });
                    });
                } else {
                    const value = (await calendarSchema.get()).val();
                    result.push(value);
                }
            }
        }
        return response.send(result);
    }

    addSchedule = async (request: express.Request, response: express.Response) => {
        try {
            const data: DynamicCalendar = request.body;
            const reqFrom = parseInt(data.from);
            const reqTo = parseInt(data.to);
            let isOcc: boolean = false;
            isOcc = (await calendarSchema.child('dynamic').orderByKey().startAt(data.date + " ").endAt(data.date + "~").get()).forEach(snap => {
                const value = snap.val();
                const from = parseInt(value.from);
                const to = parseInt(value.to);
                if (value.date === data.date) {
                    if (reqFrom === from || reqTo === to) {
                        return true;
                    } else if (reqFrom > from && reqFrom < to) {
                        return true;
                    } else if (reqTo > from && reqTo < to) {
                        return true;
                    }
                }
            });
            if (!isOcc) {
                calendarSchema.child("dynamic").child(data.date.concat('-', data.from, '-', data.to, '-', data.room)).set(data);
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
            const data: DynamicCalendar = request.body;
            calendarSchema.child("dynamic").set(data);
            response.status(200).send('ok');
        } catch (error) {
            response.status(500).send(error);
        }
    }

    getSchedules = async (request: express.Request, response: express.Response) => {
        try {
            const type = request.query.type;
            if (type?.toString().toLowerCase() === 'dynamic') {
                console.log("tinh sau");
            } else if (type?.toString().toLowerCase() === 'static') {
                console.log("tinh sau");
            } else {
                response.status(404).send("Khong tim thay");
            }
            // const user = await userSchema.doc(uid).get();
        } catch (error) {
            response.status(500).send(error);
        }
    }
}