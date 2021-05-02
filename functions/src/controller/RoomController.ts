import * as express from 'express';
import auth from './Authenticate';
import { roomPermission } from './Authorized';
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
        this.router.post(this.path, auth, roomPermission(), this.importRooms);
        this.router.get(this.path + "/countNumberTurnOnDevices", auth, roomPermission(), this.countNumberTurnOnDevices);
        this.router.get(this.path + "/getUsingRooms", auth, roomPermission(), this.getUsingRooms);
        this.router.get(this.path + "/getAllRooms", auth, this.getAllRooms);
        // this.router.get(this.path + "/countNumberTurnOnDevices", auth, roomPermission(), this.countNumberTurnOnDevices);
    }

    //nhận về room, type và trạng thái device
    //dựa vào room và type device, update trạng thái
    switchDeviceStatus = async (request: express.Request, response: express.Response) => {
        try {
            const data = request.body;
            const room = response.locals.room;
            const device: Room = data.device;
            if (data.roomName === room || response.locals.role === 'admin') {
                await roomSchema.child(data.roomName).child('device').update(device);
                return response.send("ok");
            } else {
                response.status(403).send(`may khong duoc dung phong ${data.roomName}`);
            }
        } catch (error) {
            console.log(error);
            response.status(500).json(error as Error);
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
                    if (value.light === 1) {
                        devices.onLight++;
                    }
                }
            });
            return response.json(devices);
        } catch (error) {
            response.status(500).send(error);
        }
    }

    importRooms = async (request: express.Request, response: express.Response) => {
        try {
            let rooms = request.body;
            if (rooms) {
                for (let index = 0; index < rooms.length; index++) {
                    const value = rooms[index];
                    await roomSchema.child(value.room).child('device').set(
                        {
                            conditioner: 0,
                            fan: 0,
                            light: 0,
                            powerPlug: 0
                        })
                }
            }
            return response.status(200).json(rooms.length);
        } catch (error) {
            response.status(500).send(error);
        }
    }

    getUsingRooms = async (request: express.Request, response: express.Response) => {
        try {
            let result: string[] = [];
            (await roomSchema.get()).forEach(snap => {
                let device: Room = snap.val().device;
                let key = snap.key;
                if (device.conditioner === 1 || device.light === 1 || device.powerPlug === 1 || device.fan === 1) {
                    result.push(key as string);
                }
            })
            return response.status(200).json(result)
        } catch (error) {
            response.status(500).send(error);
        }
    }

    getAllRooms = async (request: express.Request, response: express.Response) => {
        try {
            let result: string[] = [];
            (await roomSchema.get()).forEach(snap => {
                let key = snap.key;
                result.push(key as string);
            })
            return response.status(200).json(result)
        } catch (error) {
            response.status(500).send(error);
        }
    }
}
