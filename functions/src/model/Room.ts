import { database } from "firebase-admin";
import { db } from '../connector/configFireBase';
interface Room {
    name: string;
    device: {
        light: boolean,
        fan:boolean,
        ground:boolean,
        conditioner:boolean
    }
}

const roomSchema = db.ref('room')
export { roomSchema }


