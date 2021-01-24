import { database } from "firebase-admin";
import { db } from '../connector/configFireBase'

interface User extends database.DataSnapshot {
    name: string;
    email: string;
    deleted: boolean;
    deletedAt: Date | undefined;
    // constructor(name: string, email: string, deleted: boolean = false, deletedAt: Date | undefined) {
    //     super("users");
    //     this.email = email;
    //     this.name = name;
    //     this.deleted = deleted;
    //     this.deletedAt = deletedAt;
    // }
}

// const userConverter: firestore.FirestoreDataConverter<User> = {
//     toFirestore(user: User): firestore.DocumentData {
//         return { name: user.name, email: user.email };
//     },
//     fromFirestore(
//         snapshot: firestore.QueryDocumentSnapshot): User {
//         const data = snapshot.data()!;
//         snapshot.data
//         return new User(data.name, data.email, data.deleted, data.deletedAt);
//     }
// };

const userSchema = db.ref('users')
export { userSchema }


