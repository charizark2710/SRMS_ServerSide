import { db } from '../connector/configFireBase';
interface Room {
    light: number,
    fan: number,
    conditioner: number
}

const roomSchema = db.ref('room')
export { roomSchema, Room }


