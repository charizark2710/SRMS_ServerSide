import { messaging, db } from '../connector/configFireBase'
import * as express from 'express';
import message from '../model/Message'

class notificationManagement {
    router = express.Router();

    receiveMessage = () => {
        db.ref('notification/admin').on('child_added', snap => {
            const mail: message = snap.val();
        });
        db.ref('notification/admin').off('child_added', snap => {
            const mail: message = snap.val();
        });
    }

    sendMessage = (onload: message) => {
        db.ref('notification').child(onload.receiver).child(onload.id.toString()).set(onload);
    }

    
    updateIsRead=(id:string)=>{
        db.ref('notification').child('admin').child(id.toString()).update({
            isRead: true
        });
    }
    
}

const notification = new notificationManagement();


export default notification;