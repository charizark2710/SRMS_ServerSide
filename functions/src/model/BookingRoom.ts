import { db } from '../connector/configFireBase';
interface BookingRoom {
    date: string,
    roomName: string,
    startTime: string,
    endTime: string,
    status:string,
}

export {BookingRoom }


