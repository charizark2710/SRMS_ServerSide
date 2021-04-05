import * as express from 'express';
import * as tf from '@tensorflow/tfjs-node';
import * as posenet from '@tensorflow-models/posenet'
import fs from 'fs'

export class testPose {

    public router = express.Router();
    net: posenet.PoseNet;

    constructor(net: posenet.PoseNet) {
        this.net = net;
    }

    async loadAndPredict(canvas: any) {
        const $this = this;
        try {
            const input: any = tf.browser.fromPixels(canvas);
            $this.net.estimateSinglePose(input, {
                flipHorizontal: true,
            }).then(pose => {
                fs.open('./output.txt', 'a', null, (e, fd) => {
                    fs.write(fd, JSON.stringify(pose) + '\r\n', function(){console.log('')});
                });
            });
        } catch (error) {
            console.log(error);
        }
    }
}