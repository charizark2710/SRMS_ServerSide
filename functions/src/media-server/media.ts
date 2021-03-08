import child_process from 'child_process';
import { db } from '../connector/configFireBase'
import { Image, createCanvas } from 'canvas'
import { testPose } from '../TensorFlow/testPose'
import * as posenet from '@tensorflow-models/posenet'
import * as io from 'socket.io'
export class mediaServer {
    spawn = child_process.spawn;
    pose: testPose;

    constructor(net: posenet.PoseNet) {
        this.pose = new testPose(net);
    }

    async loadImage(uri: string | undefined) {
        const image = new Image();
        const promise = new Promise<Image>((resolve, reject) => {
            image.onload = () => {
                resolve(image);
            };
        });
        if (uri) {
            image.src = uri;
            return promise;
        }
    }

    async dectectMedia(connection: io.Socket) {
        try {
            const $this = this;
            connection.on('sendFPS', async (message) => {
                try {
                    const canvas = createCanvas(480, 640);
                    const ctx = canvas.getContext('2d');

                    const image = await $this.loadImage(message) as Image;
                    if (image) {
                        ctx.drawImage(image, 0, 0);
                        image.onerror = () => {
                            throw new Error('Failed to load image');
                        }
                        $this.pose.loadAndPredict(canvas).then(() => {
                            connection.emit("sendNoti", 'done');
                        });
                    }
                } catch (error) {
                    console.log(error);
                }
            });
            connection.off('message', async (message) => {
                try {
                    const canvas = createCanvas(480, 640);
                    const ctx = canvas.getContext('2d');

                    const image = await $this.loadImage(message) as Image;
                    if (image) {
                        ctx.drawImage(image, 0, 0);
                        image.onerror = () => {
                            throw new Error('Failed to load image');
                        }
                        $this.pose.loadAndPredict(canvas).then(() => {
                            connection.emit("sendNoti", 'done');
                        });
                    }
                } catch (error) {
                    console.log(error);
                }
            });
        } catch (e) {
            console.error(e);
            db.ref('video').off();
        }
    }
}
