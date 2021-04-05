import { database } from "firebase-admin";
import { db } from '../connector/configFireBase'

export interface Ban {
    role: string;
    email: string;
    bannedAt: string | undefined;
    isBanned:boolean
}




