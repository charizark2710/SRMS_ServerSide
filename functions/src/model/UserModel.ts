import { database } from "firebase-admin";
import { db } from '../connector/configFireBase'

interface User {
    name: string;
    email: string;
    banned: boolean;
    bannedAt: Date | undefined;
}

const userSchema = db.ref('users')
export { userSchema }


