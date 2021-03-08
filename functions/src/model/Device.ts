import { database } from "firebase-admin";
import { db } from '../connector/configFireBase';
interface Device {
    light: boolean;
    fan: boolean;
    ground: boolean;
    conditioner: boolean;
    room: string;
}
const deviceSchema = db.ref('devices')
export { deviceSchema }


