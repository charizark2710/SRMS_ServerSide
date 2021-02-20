import { Calendar, StaticCalendar, DynamicCalendar, calendarSchema } from '../model/Calendar'

var dateBuffer: string[] = [];
var timeBuffer: string[] = [];
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

export { dateBuffer, timeBuffer, getBuffer, deleteBuffer };