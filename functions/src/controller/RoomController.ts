import { userSchema } from '../model/UserModel'
import * as express from 'express';
import { db, adminAuth } from "../connector/configFireBase"
import auth from './Authenticate';
import authorized from './Authorized';
import notification from './NotificationManagement'
import { roomSchema, Room } from '../model/Room'

export class RoomController {
    public router = express.Router();
    path = '/room'
    constructor() {
        this.init();
    }

    init() {
        this.router.patch(this.path + "/switchDeviceStatus", this.switchDeviceStatus);
        this.router.put(this.path + "/switchAllDevicesStatus", this.switchAllDevicesStatus);
        this.router.post(this.path + "/sendDevicesStatus", this.sendDevicesStatus);
        // this.router.delete(this.path + "/delete/:id", auth, authorized({ hasRole: ['admin'] }), this.deleteRoom);
        // this.router.patch(this.path + "/banned/:id/restore", auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.restoreRoom);
        this.router.get(this.path + "/countNumberTurnOnDevices", this.countNumberTurnOnDevices);
    }



    //nhận về room, type và trạng thái device
    //dựa vào room và type device, update trạng thái
    switchDeviceStatus = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            await roomSchema.child(data.roomName).update(data.device);
            return response.send("ok");
        } catch (error) {
            response.status(500).send(error);
        }
    }

    switchAllDevicesStatus = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            await roomSchema.child(data.roomName).update(data.devices);
            return response.send("ok");
        } catch (error) {
            response.status(500).send(error);
        }
    }

    //load devices'status at roomName
    sendDevicesStatus = async (request: express.Request, response: express.Response) => {
        const data = request.body;
        const devicesData = await roomSchema.child(data.roomName).once('value')
            .then(function (snapshot) {
                return snapshot.val()
            })
        response.status(200).send(devicesData);
    }

    //đếm số thiết bị đang bật/tổng số thiết bị
    countNumberTurnOnDevices = async (request: express.Request, response: express.Response) => {
        const devices = {
            onLight: 0,
            totalLight: 0,
            onGround: 0,
            totalGround: 0,
            onFan: 0,
            totalFan: 0,
            onConditioner: 0,
            totalConditioner: 0,
        }

        try {
            (await roomSchema.get()).forEach(snapshot => {
                const value: Room = snapshot.val();
                if (value.conditioner === 1 || value.conditioner === 0) {
                    devices.totalConditioner++;
                    if (value.conditioner === 1) {
                        devices.onConditioner++;
                    }
                }
                if (value.fan === 1 || value.fan === 0) {
                    devices.totalFan++;
                    if (value.fan === 1) {
                        devices.onFan++;
                    }
                }
                if (value.ground === 1 || value.ground === 0) {
                    devices.totalGround++;
                    if (value.ground === 1) {
                        devices.onGround++;
                    }
                }
                if (value.light === 1 || value.light === 0) {
                    devices.totalLight++;
                    if (snapshot.val().light === 1) {
                        devices.onLight++;
                    }
                }
            });


            return response.json(devices);
        } catch (error) {
            response.status(500).send(error);
        }
    }
}
