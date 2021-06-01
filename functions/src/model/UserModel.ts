import { db } from '../connector/configFireBase'

interface User {
    name: string;
    email: string;
    banned: boolean;
    bannedAt: Date | undefined;
    uid: string;
    role: string;
}

const userSchema = db.ref('users')
export { userSchema, User }


