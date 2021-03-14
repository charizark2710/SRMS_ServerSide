import { Calendar, StaticCalendar, DynamicCalendar, calendarSchema } from '../model/Calendar'

var dateBuffer: string[] = [];
var timeBuffer: string[] = [];
var fullDay: any = {};

async function defineDay() {
    Object.defineProperty(fullDay, 'currentDay', {
        get: function () {
            const fullDate = new Date();
            const tempM = (fullDate.getMonth() + 1).toString();
            const tempD = fullDate.getDate().toString();
            return {
                year: fullDate.getFullYear().toString(),
                month: tempM.length === 2 ? tempM : '0' + tempM,
                date: tempD.length === 2 ? tempD : '0' + tempD,
            }
        },
        set: function (val) {
            this._currentDay = val;
        },
    });
}

function getBuffer(fullText: string) {
    calendarSchema.on('child_added', snap => {
        const value = snap.val();
        const date = value.date;
        const time = (value.from as string).concat('-', value.to);
        if (date === fullText) {
            // dateBuffer.push(value.userId + "-" + date + '-' + value.room + '-' + value.reason);
            timeBuffer.push(value.userId + "-" + time + '-' + value.room + '-' + value.reason);
        }
    });
    calendarSchema.off('child_added', snap => {
        const value = snap.val();
        const date = value.date;
        const time = (value.from as string).concat('-', value.to);
        if (date === fullText) {
            // dateBuffer.push(value.userId + "-" + date + '-' + value.room + '-' + value.reason);
            timeBuffer.push(value.userId + "-" + time + '-' + value.room + '-' + value.reason);
        }
    });
    // thay đổi là xóa đi thêm lại nên không cần child_changed
}

function deleteBuffer() {
    calendarSchema.on('child_removed', snap => {
        const value = (snap.key as string).split('-');
        // const date = value[0];
        const time = value[1];
        // dateBuffer.filter(item => (item !== date));
        timeBuffer.filter(item => (item !== time));
    });
    calendarSchema.off('child_removed', snap => {
        const value = (snap.key as string).split('-');
        // const date = value[0];
        const time = value[1];
        // dateBuffer.filter(item => (item !== date));
        timeBuffer.filter(item => (item !== time));
    });
}

function clearBuffer(year: string, month: string, date: string) {
    dateBuffer = [];
    timeBuffer = [];
    fullDay.currentDay = { year: year, month: month, date: date };
    calendarSchema.off();
}

export { dateBuffer, timeBuffer, getBuffer, deleteBuffer, defineDay, fullDay, clearBuffer };