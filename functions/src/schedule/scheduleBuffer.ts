import { Calendar, calendarSchema } from '../model/Calendar'
import getUTC, { getDate } from '../common/formatDate'


let dateBuffer: string[] = [];
let timeBuffer: string[] = [];
const fullDay: any = {};

function defineDay() {
    Object.defineProperty(fullDay, 'currentDay', {
        configurable: true,
        get: function () {
            const fullDate = getDate(new Date());
            const tempM = (fullDate.getMonth() + 1).toString();
            const tempD = fullDate.getDate().toString();
            return {
                year: fullDate.getFullYear().toString(),
                month: tempM.length === 2 ? tempM : '0' + tempM,
                date: tempD.length === 2 ? tempD : '0' + tempD,
            }
        }
    });
}

function getBuffer(fullText: string) {
    calendarSchema.child(fullDay.currentDay.year.concat(fullDay.currentDay.month, fullDay.currentDay.date)).on('child_added', snap => {
        const value: Calendar = snap.val();
        if (!value.isDone) {
            const date = value.date;
            const time = value.from.substring(0, value.from.length - 3).concat('000', '-', value.to.substring(0, value.to.length - 3) + '000');
            if (date === fullText) {
                // dateBuffer.push(value.userId + "-" + date + '-' + value.room + '-' + value.reason);
                timeBuffer.push(value.userId + "-" + time + '-' + value.room + '-' + value.reason);
            }
        }
    });
    calendarSchema.child(fullDay.currentDay.year.concat(fullDay.currentDay.month, fullDay.currentDay.date)).off('child_added', snap => {
        const value: Calendar = snap.val();
        if (!value.isDone) {
            const date = value.date;
            const time = value.from.substring(0, value.from.length - 3).concat('000', '-', value.to.substring(0, value.to.length - 3) + '000');
            if (date === fullText) {
                // dateBuffer.push(value.userId + "-" + date + '-' + value.room + '-' + value.reason);
                timeBuffer.push(value.userId + "-" + time + '-' + value.room + '-' + value.reason);
            }
        }
    });
    // thay đổi là xóa đi thêm lại nên không cần child_changed
}

function deleteBuffer() {
    calendarSchema.child(fullDay.currentDay.year.concat(fullDay.currentDay.month, fullDay.currentDay.date)).on('child_changed', snap => {
        const value: Calendar = snap.val();
        const time = (value.userId + '-' + value.from.substring(0, value.from.length - 3).concat('000', '-', value.to.substring(0, value.to.length - 3) + '000') + '-' + value.room + '-' + value.reason).toString();
        const temp = timeBuffer.filter(item => (item !== time));
        timeBuffer = temp;
    });
    calendarSchema.child(fullDay.currentDay.year.concat(fullDay.currentDay.month, fullDay.currentDay.date)).off('child_changed', snap => {
        const value: Calendar = snap.val();
        const time = (value.userId + '-' + value.from.substring(0, value.from.length - 3).concat('000', '-', value.to.substring(0, value.to.length - 3) + '000') + '-' + value.room + '-' + value.reason).toString();
        const temp = timeBuffer.filter(item => (item !== time));
        timeBuffer = temp;
    });
}

function clearBuffer() {
    dateBuffer = [];
    timeBuffer = [];
    calendarSchema.off();
}

export { dateBuffer, timeBuffer, getBuffer, deleteBuffer, defineDay, fullDay, clearBuffer };