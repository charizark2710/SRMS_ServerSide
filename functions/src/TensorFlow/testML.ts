import * as express from 'express';
import path from 'path';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import jsdom, { JSDOM } from 'jsdom'
import * as tf from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/posenet'
import * as Canvas from 'canvas'

export class testML {

    public router = express.Router();

    dom = JSDOM.fromFile(path.join(__dirname + '/test.html'), { userAgent: "http://localhost:5000/" });

    constructor() {
        this.init();
    }


    state = {
        video: null,
        stream: null,
        net: null,
        videoConstraints: {},
        // Triggers the TensorFlow model to reload
        changingArchitecture: false,
        changingMultiplier: false,
        changingStride: false,
        changingResolution: false,
        changingQuantBytes: false,
    }

    init() {

        this.router.get('/testML', this.test);
    }

    loadAndPredict = async () => {
        const canvas = (await this.dom).window.document.querySelector("#output") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        const video: any = (await this.dom).window.document.querySelector("#video") as HTMLVideoElement;

        video.onplay = function () {
            ctx!.drawImage(video, 0, 0);
        };

        const input = tf.browser.fromPixels(canvas as HTMLCanvasElement);
        const net = await bodyPix.load({
            architecture: "MobileNetV1",
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2,
            inputResolution: { width: 640, height: 480 }
        });

        const segment = await net.estimateMultiplePoses(input, {
            flipHorizontal: true,
        });

        console.log(segment);
        return segment;
    }

    test = async (request: express.Request, response: express.Response) => {
        this.loadAndPredict();
        response.send((await this.dom).serialize());
    }
}





