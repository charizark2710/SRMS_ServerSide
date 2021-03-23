import * as express from 'express';
import auth from './Authenticate';
import authorized, { roomPermission } from './Authorized';
import { roomSchema, Room } from '../model/Room'

export class RoomController {
    public router = express.Router();
    path = '/room'
    constructor() {
        this.init();
    }

    init() {
        this.router.patch(this.path + "/switchDeviceStatus", auth, roomPermission(), this.switchDeviceStatus);
        this.router.put(this.path + "/switchAllDevicesStatus", auth, roomPermission(), this.switchAllDevicesStatus);
        this.router.post(this.path + "/sendDevicesStatus", auth, roomPermission(), this.sendDevicesStatus);
        this.router.get(this.path + "/countNumberTurnOnDevices", auth, roomPermission(), this.countNumberTurnOnDevices);
    }

    //nhận về room, type và trạng thái device
    //dựa vào room và type device, update trạng thái
    switchDeviceStatus = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const room = response.locals.room;
            if (data.roomName === room || response.locals.role === 'admin') {
                await roomSchema.child(data.roomName).update(data.device);
                return response.send("ok");
            } else {
                response.status(403).send(`may khong duoc dung phong ${data.roomName}`);
            }
        } catch (error) {
            response.status(500).send(error);
        }
    }

    switchAllDevicesStatus = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const room = response.locals.room;
            if (data.roomName === room || response.locals.role === 'admin') {
                await roomSchema.child(data.roomName).update(data.devices);
                return response.send("ok");
            } else {
                response.status(403).send(`may khong duoc dung phong ${data.roomName}`);
            }
        } catch (error) {
            response.status(500).send(error);
        }
    }

    //load devices'status at roomName
    sendDevicesStatus = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const room = response.locals.room;
            if (data.roomName === room || response.locals.role === 'admin') {
                const devicesData: Room = await roomSchema.child(data.roomName).once('value')
                    .then(function (snapshot) {
                        return snapshot.val();
                    })
                response.status(200).send(devicesData);
            } else {
                response.status(403).send(`may khong duoc dung phong ${data.roomName}`);
            }
        } catch (error) {
            response.status(500).send(error);
        }
    }

    //đếm số thiết bị đang bật/tổng số thiết bị
    countNumberTurnOnDevices = async (request: express.Request, response: express.Response) => {
        const devices = {
            onLight: 0,
            totalLight: 0,
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
