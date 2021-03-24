import * as express from 'express';
import { Calendar, calendarSchema } from '../model/Calendar'
import auth from './Authenticate';

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
                        calendarSchema.child(date).on('child_added', snap => {
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
                        calendarSchema.child(date).on('child_added', snap => {
                            const val = snap.val();
                            if (userId === val.userId) {
                                result.push(val);
                            }
                        });
                    }
                }
            } else if (isCurrentUser?.toString() === '0') {
                const userId = response.locals.employeeId;
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    for (const date of dates) {
                        calendarSchema.child(date).on('child_added', snap => {
                            const val = snap.val();
                            for (const room of rooms) {
                                if (userId !== val.userId && room === val.room) {
                                    result.push(val);
                                }
                            }
                        });
                    }
                } else {
                    for (const date of dates) {
                        calendarSchema.child(date).on('child_added', snap => {
                            const val = snap.val();
                            if (userId !== val.userId) {
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
                        calendarSchema.child(date).on('child_added', snap => {
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
                        calendarSchema.child(date).on('child_added', snap => {
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
                        calendarSchema.on('child_added', async snap => {
                            snap.ref.on('child_added', snap => {
                                if (snap.val().userId === userId && snap.val().room === room) {
                                    result.push(snap.val());
                                }
                            });
                        });
                    });
                } else {
                    calendarSchema.on('child_added', async snap => {
                        snap.ref.on('child_added', snap => {
                            if (snap.val().userId === userId) {
                                result.push(snap.val());
                            }
                        });
                    });
                }
            } else if (isCurrentUser?.toString() === '0') {
                const userId = response.locals.employeeId;
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    rooms.forEach(async room => {
                        calendarSchema.on('child_added', async snap => {
                            snap.ref.on('child_added', snap => {
                                if (snap.val().userId !== userId && snap.val().room === room) {
                                    result.push(snap.val());
                                }
                            });
                        });
                    });
                } else {
                    calendarSchema.on('child_added', async snap => {
                        snap.ref.on('child_added', snap => {
                            if (snap.val().userId !== userId) {
                                result.push(snap.val());
                            }
                        });
                    });
                }
            }
            else {
                if (selectedRooms) {
                    const rooms = selectedRooms.toString().split(',');
                    rooms.forEach(async room => {
                        calendarSchema.on('child_added', async snap => {
                            snap.ref.on('child_added', snap => {
                                if (snap.val().room === room) {
                                    result.push(snap.val());
                                }
                            });
                        });
                    });
                } else {
                    calendarSchema.on('child_added', async snap => {
                        snap.ref.on('child_added', snap => {
                            result.push(snap.val());
                        })
                    })
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
            calendarSchema.child(data.date).on('child_added', snap => {
                const value: Calendar = snap.val();
                const from = parseInt(value.from);
                const to = parseInt(value.to);
                if (value.date === data.date && value.room === data.room) {
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
                calendarSchema.child(data.date).child(data.from.concat('-', data.to, '-', data.room)).set(data);
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
            calendarSchema.child(id).remove();
            calendarSchema.child(id).set(data);
            response.status(200).send('ok');
        } catch (error) {
            response.status(500).send(error);
        }
    }

    getSchedules = async (request: express.Request, response: express.Response) => {
        try {
            const id = request.params.id;
            const result = (await calendarSchema.child(id).get()).val();
            response.status(200).json(result);
        } catch (error) {
            response.status(500).send(error);
        }
    }
}