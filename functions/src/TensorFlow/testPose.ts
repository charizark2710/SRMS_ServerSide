import * as express from 'express';
import * as tf from '@tensorflow/tfjs-node';
import * as posenet from '@tensorflow-models/posenet'

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
                console.log(pose);
            });
        } catch (error) {
            console.log(error);
        }
    }
}