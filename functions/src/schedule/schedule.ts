import { dateBuffer, timeBuffer, getBuffer, deleteBuffer, defineDay, fullDay, clearBuffer } from './scheduleBuffer'
import notification from '../controller/NotificationManagement'
import { adminAuth } from '../connector/configFireBase'
import { userSchema, User } from '../model/UserModel'
import { calendarSchema } from '../model/Calendar'
import { roomSchema } from '../model/Room'

let t: any = undefined;

export default class Schedule {
    constructor() {
        console.log("Start Timer");
        this.setSchedule();
    }

    async setSchedule() {
        !fullDay.currentDay ? await defineDay() : '';
        const fullDate = fullDay.currentDay;
        const YMD = fullDate.year.concat(fullDate.month, fullDate.date);
        getBuffer(YMD);
        deleteBuffer();
        t = setInterval(this.timer, 1000, YMD);
    }

    timer(YMD: string) {
        const currentTime = new Date();
        currentTime.setMilliseconds(0);
        const tempM = (currentTime.getMonth() + 1).toString();
        const tempD = currentTime.getDate().toString();
        const year = currentTime.getFullYear().toString();
        const month = tempM.length === 2 ? tempM : '0' + tempM;
        const date = tempD.length === 2 ? tempD : '0' + tempD;
        if (!year.concat(month, date).match(YMD)) {
            clearInterval(t);
            clearBuffer(year, month, date);
            new Schedule();
        } else {
            const tempH = currentTime.getHours().toString();
            const tempMin = currentTime.getMinutes().toString();
            const tempSec = currentTime.getSeconds().toString();
            const hours = tempH.length === 2 ? tempH : '0' + tempH;
            const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
            const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
            const fullTime = hours.concat(min, sec, '000');
            timeBuffer.forEach(async val => {
                const value = val.split('-');
                const timeTemp = new Date(currentTime.getTime());
                const startTime = timeTemp.setHours(parseInt(value[1].substring(0, 2)), parseInt(value[1].substring(2, 4)), parseInt(value[1].substring(4, 6)), parseInt(value[1].substring(6)));
                const endTime = timeTemp.setHours(parseInt(value[2].substring(0, 2)), parseInt(value[2].substring(2, 4)), parseInt(value[2].substring(4, 6)), parseInt(value[2].substring(6)));
                const halfHours = 60 * 30 * 1000;
                if (Math.abs(startTime - currentTime.getTime()) === halfHours) {
                    const userInfo: User = (await userSchema.child(value[0]).get()).val();
                    await adminAuth.setCustomUserClaims(userInfo.uid, {...(await adminAuth.getUser(userInfo.uid)).customClaims, room: value[3] });
                    notification.sendMessage({ id: `admin-${YMD.concat('-', fullTime)}`, isRead: false, message: `Còn 30p là đến phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: YMD.concat('-', fullTime) });
                }
                else if (Math.abs(endTime - currentTime.getTime()) === halfHours) {
                    notification.sendMessage({ id: `admin-${YMD.concat('-', fullTime)}`, isRead: false, message: `Còn 30p là hết giờ phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: YMD.concat('-', fullTime) });
                }
                if (value[1] === fullTime) {
                    const userInfo: User = (await userSchema.child(value[0]).get()).val();
                    notification.sendMessage({ id: `admin-${YMD.concat('-', fullTime)}`, isRead: false, message: `Đến giờ phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: YMD.concat('-', fullTime) });
                    await adminAuth.setCustomUserClaims(userInfo.uid, {...(await adminAuth.getUser(userInfo.uid)).customClaims, room: value[3] });
                }
                else if (value[2] === fullTime) {
                    const userInfo: User = (await userSchema.child(value[0]).get()).val();
                    notification.sendMessage({ id: `admin-${YMD.concat('-', fullTime)}`, isRead: false, message: `Hết Giờ phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: YMD.concat('-', fullTime) });
                    await calendarSchema.child(YMD).child(value[3].concat('-', value[1], '-', value[2])).update({ isDone: true });
                    await roomSchema.child(value[3]).child('device').update({
                        conditioner: 0,
                        fan: 0,
                        light: 0,
                        powerPlug: 0
                    });
                    await adminAuth.setCustomUserClaims(userInfo.uid, {...(await adminAuth.getUser(userInfo.uid)).customClaims, room: null });
                }
            });
        }
    }
}
