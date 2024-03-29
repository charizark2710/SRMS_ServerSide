import { dateBuffer, timeBuffer, getBuffer, deleteBuffer, defineDay, fullDay, clearBuffer } from './scheduleBuffer'
import notification from '../controller/NotificationManagement'
import { adminAuth } from '../connector/configFireBase'
import { userSchema, User } from '../model/UserModel'
import { calendarSchema } from '../model/Calendar'
import { roomSchema } from '../model/Room'
import getUTC, { getDate } from '../common/formatDate'

let t: any = undefined;

const giveAuthen = async (userId: string, room: string | null) => {
    const promise = new Promise<User>(async (resolve, reject) => {
        const userInfo: User = (await userSchema.child(userId).get()).val();
        if (userInfo) {
            await adminAuth.setCustomUserClaims(userInfo.uid, { ...(await adminAuth.getUser(userInfo.uid)).customClaims, room: room });
            resolve(userInfo);
        }
    });
    return promise;
};

export default class Schedule {
    constructor() {
        console.log("Start Timer");
        this.setSchedule();
    }

    async setSchedule() {
        defineDay();
        const fullDate = fullDay.currentDay;
        const YMD = fullDate.year.concat(fullDate.month, fullDate.date);
        getBuffer(YMD);
        deleteBuffer();
        t = setInterval(this.timer, 1000, YMD);
    }

    timer(YMD: string) {
        const currentTime = getDate(new Date());
        currentTime.setMilliseconds(0);
        const tempM = (currentTime.getMonth() + 1).toString();
        const tempD = currentTime.getDate().toString();
        const year = currentTime.getFullYear().toString();
        const month = tempM.length === 2 ? tempM : '0' + tempM;
        const date = tempD.length === 2 ? tempD : '0' + tempD;
        if (!year.concat(month, date).match(YMD)) {
            clearInterval(t);
            clearBuffer();
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
                    console.log('ok' + val);
                    notification.sendMessage({ id: `${YMD.concat('-', fullTime)}-admin`, isRead: false, message: `Còn 30p là đến phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: YMD.concat('-', fullTime), url: 'not thing' });
                }
                else if (Math.abs(endTime - currentTime.getTime()) === halfHours) {
                    notification.sendMessage({ id: `${YMD.concat('-', fullTime)}-admin`, isRead: false, message: `Còn 30p là hết giờ phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: YMD.concat('-', fullTime), url: 'not thing' });
                }
                if (value[1] === fullTime) {
                    notification.sendMessage({ id: `${YMD.concat('-', fullTime)}-admin`, isRead: false, message: `Đến giờ phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: YMD.concat('-', fullTime), url: 'not thing' });
                    giveAuthen(value[0], value[3]);
                }
                else if (value[2] === fullTime) {
                    notification.sendMessage({ id: `${YMD.concat('-', fullTime)}-admin`, isRead: false, message: `Hết Giờ phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: YMD.concat('-', fullTime), url: 'not thing' });
                    calendarSchema.child(YMD).child(value[3].concat('-', value[1], '-', value[2])).update({ isDone: true });
                    giveAuthen(value[0], null);
                    roomSchema.child(value[3]).child('device').update({
                        conditioner: 0,
                        fan: 0,
                        light: 0,
                        powerPlug: 0
                    });
                }
            });
        }
    }
}
