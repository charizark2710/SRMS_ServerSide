import { db } from '../connector/configFireBase'

interface Calendar {
    date: string,
    room: string,
    userId: string,
    userName: string,
    reason: string
}

interface StaticCalendar extends Calendar {
    slot: number
}

interface DynamicCalendar extends Calendar {
    from: string,
    to: string,
}

const calendarSchema = db.ref('calendar');

export { Calendar, StaticCalendar, DynamicCalendar, calendarSchema }

