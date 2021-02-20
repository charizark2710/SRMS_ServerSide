import * as express from 'express';
import { Calendar, StaticCalendar, DynamicCalendar, calendarSchema } from '../model/Calendar'
import auth from './Authenticate';
import authorized from './Authorized';

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
                    for (let date of dates) {
                        (await calendarSchema.child('dynamic').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            for (let room of rooms) {
                                if (userId === val.userId && room === val.room) {
                                    result.push(val);
                                }
                            }
                        });
                        (await calendarSchema.child('static').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            for (let room of rooms) {
                                if (userId === val.userId && room === val.room) {
                                    result.push(val);
                                }
                            }
                        });
                    }
                } else {
                    for (let date of dates) {
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
                    for (let date of dates) {
                        (await calendarSchema.child('dynamic').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            for (let room of rooms) {
                                if (room === val.room) {
                                    result.push(val);
                                }
                            }
                        });
                        (await calendarSchema.child('static').orderByKey().startAt(date + " ").endAt(date + "~").get()).forEach(snap => {
                            const val = snap.val();
                            for (let room of rooms) {
                                if (room === val.room) {
                                    result.push(val);
                                }
                            }
                        });
                    }
                } else {
                    for (let date of dates) {
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
                            if (snap.val().userId == userId && snap.val().room == room) {
                                result.push(snap.val());
                            }
                        });
                        (await calendarSchema.child('static').get()).forEach(snap => {
                            if (snap.val().userId == userId && snap.val().room == room) {
                                result.push(snap.val());
                            }
                        });
                    });
                } else {
                    (await calendarSchema.child('dynamic').get()).forEach(snap => {
                        if (snap.val().userId == userId) {
                            result.push(snap.val());
                        }
                    });
                    (await calendarSchema.child('static').get()).forEach(snap => {
                        if (snap.val().userId == userId) {
                            result.push(snap.val());
                        }
                    });
                }
            } else {
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    rooms.forEach(async room => {
                        (await calendarSchema.child('dynamic').get()).forEach(snap => {
                            if (snap.val().room == room) {
                                result.push(snap.val());
                            }
                        });
                        (await calendarSchema.child('static').get()).forEach(snap => {
                            if (snap.val().room == room) {
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
            calendarSchema.child("dynamic").child(data.date).set(data);
            response.status(200).send('ok');
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
            const data: DynamicCalendar = request.body;

            const uid = request.params.uid;
            const type = request.query.type;
            const room = request.query.room;
            if (type?.toString().toLowerCase() === 'dynamic') {

            } else if (type?.toString().toLowerCase() === 'static') {

            } else {
                response.status(404).send("Khong tim thay");
            }
            // const user = await userSchema.doc(uid).get();
        } catch (error) {
            response.status(500).send(error);
        }
    }
}