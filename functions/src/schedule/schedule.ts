import * as buffer from './scheduleBuffer'

export default class Schedule {

    constructor() {
        this.setSchedule();
    }

    setSchedule = async () => {
        await buffer.defineDay();
        const fullDate = buffer.fullDay.currentDay;
        console.log(buffer.fullDay);
        const fullText = fullDate.year.concat(fullDate.month, fullDate.date);
        buffer.getBuffer(fullText);
        console.log(buffer.dateBuffer, '-', buffer.timeBuffer);
        setInterval(this.timer, 1000, fullText);
    }

    timer = (fullText: string) => {
    }
}
