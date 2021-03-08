import { dateBuffer, timeBuffer, getBuffer, deleteBuffer, defineDay, fullDay, clearBuffer } from './scheduleBuffer'
import notification from '../controller/NotificationManagement'
import { calendarSchema } from '../model/Calendar'

export default class Schedule {

    constructor() {
        this.setSchedule();
    }

    async setSchedule() {
        await defineDay();
        const fullDate = fullDay.currentDay;
        console.log(fullDay);
        const fullText = fullDate.year.concat(fullDate.month, fullDate.date);
        getBuffer(fullText);
        deleteBuffer();
        console.log(dateBuffer, '-', timeBuffer);
        setInterval(this.timer, 1500, fullText);
    }

    timer(fullText: string) {
        const time = new Date();
        const tempM = (time.getMonth() + 1).toString();
        const tempD = time.getDate().toString();
        const year = time.getFullYear().toString();
        const month = tempM.length === 2 ? tempM : '0' + tempM;
        const date = tempD.length === 2 ? tempD : '0' + tempD;
        if (!year.concat(month, date).match(fullText)) {
            fullDay.currentDay = { year: year, month: month, date: date };
            clearBuffer();
            getBuffer(year.concat(month, date));
        } else {
            const tempH = time.getHours().toString();
            const tempMin = time.getMinutes().toString();
            const tempSec = time.getSeconds().toString();
            const hours = tempH.length === 2 ? tempH : '0' + tempH;
            const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
            const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
            const fullTime = hours.concat(min, sec);
            timeBuffer.forEach(val => {
                const value = val.split('-');
                if ((parseInt(value[1]) - 1000000).toString() === fullTime) {
                    notification.sendMessage({ id: `admin_${fullText.concat('-', fullTime)}`, isRead: false, message: `Còn 1 tiếng là đến phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: fullText.concat('-', fullTime) });
                }
                else if ((parseInt(value[2]) - 1000000).toString() === fullTime) {
                    notification.sendMessage({ id: `admin_${fullText.concat('-', fullTime)}`, isRead: false, message: `Còn 1 tiếng là hết giờ phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: fullText.concat('-', fullTime) });
                }
                if (value[1] === fullTime) {
                    notification.sendMessage({ id: `admin_${fullText.concat('-', fullTime)}`, isRead: false, message: `Đến giờ phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: fullText.concat('-', fullTime) });
                }
                else if (value[2] === fullTime) {
                    notification.sendMessage({ id: `admin_${fullText.concat('-', fullTime)}`, isRead: false, message: `Hết Giờ phòng ${value[3]} với lý do ${value[4]}`, receiver: value[0], sender: "admin", sendAt: fullText.concat('-', fullTime) });
                    calendarSchema.child('dynamic').child(fullText.concat('-', value[1], '-', value[2], '-', value[3])).remove();
                }
            });
        }
    }
}
