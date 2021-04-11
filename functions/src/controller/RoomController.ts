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
        this.router.put(this.path + "/switchAllDevicesStatus/:id", auth, roomPermission(), this.switchAllDevicesStatus);
        this.router.post(this.path + "/sendDevicesStatus", auth, roomPermission(), this.sendDevicesStatus);
        this.router.get(this.path + "/countNumberTurnOnDevices",auth, roomPermission(), this.countNumberTurnOnDevices);
        // this.router.get(this.path + "/countNumberTurnOnDevices", auth, roomPermission(), this.countNumberTurnOnDevices);
    }

    async updateReport(room: string, device: string, status: number) {
        const deviceObj: any = {};
        if (status === 1) {
            const date = new Date();
            deviceObj[device] = date.getTime();
            roomSchema.child(room).child('report').update(deviceObj);
        } else {
            (await roomSchema.child(room).child('report').get()).val();
        }
    }

    //nhận về room, type và trạng thái device
    //dựa vào room và type device, update trạng thái
    switchDeviceStatus = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const room = response.locals.room;
            const devices: Room = data.device;
            if (data.roomName === room || response.locals.role === 'admin') {
                await roomSchema.child(data.roomName).child('device').update(devices);

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
            const reqRoom = request.params.id;
            const room = response.locals.room;
            const status = parseInt(request.query.q as string);
            if (reqRoom === room || response.locals.role === 'admin') {
                const devices: Room = { conditioner: status, fan: status, light: status, powerPlug: status };
                await roomSchema.child(reqRoom).child('device').set(devices);
                return response.send("ok");
            } else {
                response.status(403).send(`may khong duoc dung phong ${reqRoom}`);
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
                const devicesData: Room = await roomSchema.child(data.roomName).child('device').once('value')
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
            onPowerPlug: 0,
            totalPowerPlug: 0,
        };
        try {
            (await roomSchema.get()).forEach(snapshot => {
                const value: Room = snapshot.val().device;
                if (value.conditioner === 1 || value.conditioner === 0) {
                    devices.totalConditioner++;
                    if (value.conditioner === 1) {
                        devices.onConditioner++;
                    }
                }
                if (value.powerPlug === 1 || value.powerPlug === 0) {
                    devices.totalPowerPlug++;
                    if (value.powerPlug === 1) {
                        devices.onPowerPlug++;
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
