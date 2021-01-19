import * as express from 'express';
import * as tf from '@tensorflow/tfjs-node';
import * as posenet from '@tensorflow-models/posenet'
import * as Canvas from 'canvas'

export class testPose {

    public router = express.Router();
    net: posenet.PoseNet;

    constructor(net: posenet.PoseNet) {
        this.net = net;
    }

    loadAndPredict = async (canvas: any) => {
        try {
            // const canvas = Canvas.createCanvas(480, 640);
            // const image = new Canvas.Image();
            // const ctx = canvas.getContext('2d').drawImage(image,0,0);
            const input: any = tf.browser.fromPixels(canvas);
            this.net.estimateSinglePose(input, {
                flipHorizontal: true,
            }).then(pose => {
                console.log(pose);
            });
        } catch (error) {
            console.log(error);
        }
    }
}





