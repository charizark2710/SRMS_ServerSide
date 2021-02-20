import * as buffer from './scheduleBuffer'

export default class Schedule {
    fullDate: Date = new Date();
    year: string = '';
    month: string = '';
    date: string = '';
    temp: string = '';
    hours: string = '';
    minutes: string = '';
    second: string = '';

    getCurrentTime = () => {
        this.fullDate = new Date();
        this.year = this.fullDate.getFullYear().toString();
        this.month = this.fullDate.getMonth().toString();
        this.date = this.fullDate.getDate().toString();
        this.temp = this.fullDate.getHours().toString();
        this.hours = this.temp.length === 2 ? this.temp : '0' + this.temp;
        this.temp = this.fullDate.getMinutes().toString();
        this.minutes = this.temp.length === 2 ? this.temp : '0' + this.temp;
        this.temp = this.fullDate.getSeconds().toString();
        this.second = this.temp.length === 2 ? this.temp : '0' + this.temp;
    }

    setSchedule = () => {
        this.getCurrentTime();
        const fullText = this.year.concat(this.month, this.date);
        buffer.getBuffer(fullText);
        setInterval(this.timer, 1000, fullText);
    }

    timer = (fullText: string) => {
        this.temp = this.fullDate.getHours().toString();
        this.hours = this.temp.length === 2 ? this.temp : '0' + this.temp;
        this.temp = this.fullDate.getMinutes().toString();
        this.minutes = this.temp.length === 2 ? this.temp : '0' + this.temp;
        this.temp = this.fullDate.getSeconds().toString();
        this.second = this.temp.length === 2 ? this.temp : '0' + this.temp;
    }
}
