import { messaging, db } from '../connector/configFireBase'
import * as express from 'express';
import message from '../model/Message'

class notificationManagement {
    router = express.Router();

    constructor() {

    }

    receiveMessage = () => {
        db.ref('notification/admin').on('child_added', snap => {
            const mail: message = snap.val();
            console.log(mail);
        });
        db.ref('notification/admin').off('child_added', snap => {
            const mail: message = snap.val();
            console.log(mail);
        });
    }

    sendMessage = (onload: message) => {
        db.ref('notification'.concat('/', onload.receiver)).child(onload.sendAt.toString()).set(onload);
    }
}

const notification = new notificationManagement();


export default notification;