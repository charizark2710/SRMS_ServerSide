import * as express from 'express';
import * as tf from '@tensorflow/tfjs-node';
import * as posenet from '@tensorflow-models/posenet'
import { roomSchema } from '../model/Room'

import fs from 'fs'

export class testPose {

    public router = express.Router();
    net: posenet.PoseNet;

    constructor(net: posenet.PoseNet) {
        console.log("Loaded ok 2");
        this.net = net;
    }

    async loadAndPredict(canvas: any, room: string) {
        const $this = this;
        try {
            const input: any = tf.browser.fromPixels(canvas);
            console.log("Load and predict");
            $this.net.estimateMultiplePoses(input, {
                flipHorizontal: false,
                maxDetections: 5,
                nmsRadius: 20
            }).then(pose => {
                let checkRoom: boolean = false;
                console.log("checked");
                for (const p of pose) {
                    console.log(p.score);
                    if (p.score > 0.3) {
                        checkRoom = true;
                        break;
                    }
                }
                if (checkRoom) {
                    roomSchema.child(room).child('device').update({ light: 1 });
                } else {
                    roomSchema.child(room).child('device').update({ light: 0, conditioner: 0, fan: 0, powerPlug: 0 });
                }
                fs.open('./output.txt', 'a', null, (e, fd) => {
                    fs.write(fd, JSON.stringify(pose) + '\r\n', function () { console.log('') });
                });
            }).catch(e => {
                console.log("Error" + e);
            });
        } catch (error) {
            console.log(error);
        }
    }
}