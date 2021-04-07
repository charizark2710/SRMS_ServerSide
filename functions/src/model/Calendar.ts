import { db } from '../connector/configFireBase'

interface Calendar {
    date: string,
    room: string,
    userId: string,
    userName: string,
    reason: string,
    from: string,
    to: string,
    isDone?: boolean
}

const calendarSchema = db.ref('calendar');

export { Calendar, calendarSchema }

