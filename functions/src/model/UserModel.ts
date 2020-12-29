import { firestore } from "firebase-admin";
import { db } from '../connector/dtbHelper'

class User {
    name: string;
    password: string;
    email: string;
    deleted: boolean;
    deletedAt: Date | undefined;
    constructor(name: string, password: string, email: string, deleted: boolean = false, deletedAt: Date | undefined) {
        this.email = email;
        this.name = name;
        this.password = password;
        this.deleted = deleted;
        this.deletedAt = deletedAt;
    }
}

const userConverter: firestore.FirestoreDataConverter<User> = {
    toFirestore(user: User): firestore.DocumentData {
        return { name: user.name, password: user.password, email: user.email };
    },
    fromFirestore(
        snapshot: firestore.QueryDocumentSnapshot): User {
        const data = snapshot.data()!;
        snapshot.data
        return new User(data.name, data.password, data.email, data.deleted, data.deletedAt);
    }
};

const userSchema = db.collection('users').withConverter(userConverter);
export { userSchema }


