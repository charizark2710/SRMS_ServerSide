import * as express from 'express';
import { db } from "../connector/configFireBase"
import notification from './NotificationManagement'
import auth from './Authenticate';
import authorized from './Authorized';
import { parse } from 'cookie';

import { Calendar, calendarSchema } from '../model/Calendar'


export class ChangeRoomController {
    public router = express.Router();
    path = '/changeRoom'
    constructor() {
        this.init();
    }

    init() {
        this.router.get(this.path + '', auth, this.getCurrentRoom);
       
    }

    getCurrentRoom= async (request: express.Request, response: express.Response) => {
        try {
            let result:any={};
            const currentUser = response.locals.employeeId;

            const time = new Date();
            const tempM = (time.getMonth() + 1).toString();
            const tempD = time.getDate().toString();
            const year = time.getFullYear().toString();
            const month = tempM.length === 2 ? tempM : '0' + tempM;
            const date = tempD.length === 2 ? tempD : '0' + tempD;
            const tempH = time.getHours().toString();
            const tempMin = time.getMinutes().toString();
            const tempSec = time.getSeconds().toString();
            const hours = tempH.length === 2 ? tempH : '0' + tempH;
            const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
            const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
            const fullDate = year.concat(month, date);
            const tempFullTime = hours.concat(min, sec, '000');
            const fullTime=parseInt(tempFullTime);


            (await calendarSchema.get()).forEach(snapshot => {
                if(snapshot.key == fullDate){
                    snapshot.forEach((calendar) => {
                        //tìm room hiện tại của current user
                        if(calendar.val().userId == currentUser){
                            let from=parseInt(calendar.val().from)
                            let to=parseInt(calendar.val().to)
                            if(fullTime>=from && fullTime <= to && !calendar.val().isDone){
                                result={
                                    id:calendar.key,
                                    room:calendar.val().room,
                                    from:calendar.val().from,
                                    to:calendar.val().to,
                                }
                            }
                        }
                    });
                }
            })

            return response.status(200).json(result);
        } catch (error) {
            response.status(500).send(error);
        }
    }

    //(1)date, start, end, room , accepted=> booking
    //lấy phòng +key
    //gửi lại admin cái key, userId...tạo noti =>admin click vô noti, cầm cái key load lên data. load luôn danh sách phòng trống.
    //admin accept => cầm cái key để cập nhật lại isdone=true, cập nhật lại booking (1)=> thêm mới calendar


    //1. send request to change room.
    sendChangeRoomRequest=async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body; //id trong calendar, userId, room

            //tạo ID
            const time = new Date();
            const tempM = (time.getMonth() + 1).toString();
            const tempD = time.getDate().toString();
            const year = time.getFullYear().toString();
            const month = tempM.length === 2 ? tempM : '0' + tempM;
            const date = tempD.length === 2 ? tempD : '0' + tempD;
            const tempH = time.getHours().toString();
            const tempMin = time.getMinutes().toString();
            const tempSec = time.getSeconds().toString();
            const tempMs = time.getMilliseconds().toString();
            const hours = tempH.length === 2 ? tempH : '0' + tempH;
            const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
            const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
            tempMs.length === 1 ? tempMs + '0' : tempMs;
            const ms = tempMs.length === 3 ? tempMs : '0' + tempMs;
            const fullTime = year.concat(month, date) + "-" + hours.concat(min, sec, ms);
            const id = data.userId.toString() + '-' + fullTime;//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết

            //gửi cho admin
            notification.sendMessage({
                message: ' sent a request to change room '+data.room,
                receiver: "admin",
                sender: data.userId,
                sendAt: fullTime,
                isRead: false,
                id: id,
                url: "/changeRoomRequest/" + data.id,
                isValid: true,
            });
            //gửi cho chính user đặt phòng
            notification.sendMessage({
                message: 'Your request to change room ' + data.room + ' is being processed',
                receiver: data.userId,
                sender: "admin",
                sendAt: fullTime,
                isRead: false,
                id: id,
            });
               
            return response.status(200).json("ok");
        } catch (err) {
            response.status(500).send(err);
        }
    }


    //2.click vô noti, load data -> calendar controller

    //3. load phòng trống => bookroom controller

    //4. accept đổi phòng
      //4.1 update room trong booking
      //4.2 update isDone trong calendar
      //4.3 new mới trong calendar
      //4.4 noti

    acceptChangeRoomRequest= async (request: express.Request, response: express.Response) => {
        try {
            let currentBookingId;
            const data = request.body; //id trong calendar, userId, current room, newRoom
            //tạo ID
            const time = new Date();
            const tempM = (time.getMonth() + 1).toString();
            const tempD = time.getDate().toString();
            const year = time.getFullYear().toString();
            const month = tempM.length === 2 ? tempM : '0' + tempM;
            const date = tempD.length === 2 ? tempD : '0' + tempD;
            const tempH = time.getHours().toString();
            const tempMin = time.getMinutes().toString();
            const tempSec = time.getSeconds().toString();
            const tempMs = time.getMilliseconds().toString();
            const hours = tempH.length === 2 ? tempH : '0' + tempH;
            const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
            const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
            tempMs.length === 1 ? tempMs + '0' : tempMs;
            const ms = tempMs.length === 3 ? tempMs : '0' + tempMs;
            const fullTime = year.concat(month, date) + "-" + hours.concat(min, sec, ms);
            const id = data.userId.toString() + '-' + fullTime;//tránh trùng lịch bị overrride + dễ truy vấn khi xem chi tiết

            //4.1 update room trong booking
            (await db.ref('booking').get()).forEach((snap)=>{
                if(snap.val().startTime == data.startTime && snap.val().endTime == data.endTime && 
                    snap.val().date == data.date && snap.val().status == "accepted"){
                        currentBookingId=snap.key;
                }
            })
            if(currentBookingId){
                await db.ref('booking').child(currentBookingId).update({
                    roomName:data.newRoom,
                })
            }

            //4.2 update isDone trong calendar






            //gửi cho admin
            notification.sendMessage({
                message: ' sent a request to change room '+data.room,
                receiver: "admin",
                sender: data.userId,
                sendAt: fullTime,
                isRead: false,
                id: id,
                url: "/changeRoomRequest/" + data.id,
                isValid: true,
            });
            //gửi cho chính user đặt phòng
            notification.sendMessage({
                message: 'Your request to change room ' + data.room + ' is being processed',
                receiver: data.userId,
                sender: "admin",
                sendAt: fullTime,
                isRead: false,
                id: id,
            });
               
            return response.status(200).json("ok");
        } catch (err) {
            response.status(500).send(err);
        }
    }

    

}
