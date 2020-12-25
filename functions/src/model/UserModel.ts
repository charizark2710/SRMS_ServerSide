import { firestore } from "firebase-admin";
import { db } from '../connector/dtbHelper'

class User {
    name: string;
    password: string;
    email: string;
    constructor(name: string, password: string, email: string) {
        this.email = email;
        this.name = name;
        this.password = password;
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
        return new User(data.name, data.password, data.email);
    }
};

const userSchema = db.collection('users').doc().withConverter(userConverter);
export { userSchema }


