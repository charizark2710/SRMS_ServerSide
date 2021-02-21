import { Calendar, StaticCalendar, DynamicCalendar, calendarSchema } from '../model/Calendar'

var dateBuffer: string[] = [];
var timeBuffer: string[] = [];
var fullDay: any = {};

async function defineDay() {
    Object.defineProperty(fullDay, 'currentDay', {
        get: function () {
            const fullDate = new Date();
            const tempM = fullDate.getMonth().toString();
            const tempD = fullDate.getDate().toString();
            const tempH = fullDate.getHours().toString();
            const tempMin = fullDate.getMinutes().toString();
            const tempS = fullDate.getSeconds().toString();

            return {
                year: fullDate.getFullYear().toString(),
                month: tempM.length === 2 ? tempM : '0' + tempM,
                date: tempD.length === 2 ? tempD : '0' + tempD,
                hours: tempH.length === 2 ? tempH : '0' + tempH,
                minutes: tempMin.length === 2 ? tempMin : '0' + tempMin,
                second: tempS.length === 2 ? tempS : '0' + tempS,
            }
        }
    });
}

function getBuffer(fullText: string) {
    calendarSchema.child('dynamic').on('child_added', snap => {
        const value = (snap.val().date as string).split('-');
        if (value[0].match(fullText)) {
            const date = value[0];
            const time = value[1];
            dateBuffer.push(date);
            timeBuffer.push(time);
        }
    });
    calendarSchema.child('dynamic').off('child_added', snap => {
        const value = (snap.val().date as string).split('-');
        if (value[0].match(fullText)) {
            const date = value[0];
            const time = value[1];
            dateBuffer.push(date);
            timeBuffer.push(time);
        }
    });
}

function deleteBuffer() {
    calendarSchema.child('dynamic').on('child_removed', snap => {
        const value = (snap.val().date as string).split('-');
        const date = value[0];
        const time = value[1];
        dateBuffer.filter(item => item !== date);
        timeBuffer.filter(item => item !== time);
    });
    calendarSchema.child('dynamic').off('child_removed', snap => {
        const value = (snap.val().date as string).split('-');
        const date = value[0];
        const time = value[1];
        dateBuffer.filter(item => item !== date);
        timeBuffer.filter(item => item !== time);
    });
}

export { dateBuffer, timeBuffer, getBuffer, deleteBuffer, defineDay, fullDay };