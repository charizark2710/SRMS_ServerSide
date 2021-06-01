import child_process from 'child_process';
import { db } from '../connector/configFireBase'
import { Canvas, Image, createCanvas } from 'canvas'
import { testPose } from '../TensorFlow/testPose'
import { Reference } from 'firebase-admin/node_modules/@firebase/database-types/index'
import * as posenet from '@tensorflow-models/posenet'

export class mediaServer {
    spawn = child_process.spawn;
    pose: testPose;
    camera: Reference[];
    constructor(net: posenet.PoseNet) {
        this.pose = new testPose(net);
        this.camera = [];
    }

    async dectectMedia() {
        try {
            console.log("Detect start");
            const $this = this;
            this.camera.push = function (arg) {
                const loadImage = async function (uri: string) {
                    const image = new Image();
                    const promise = new Promise<Image>((resolve, reject) => {
                        image.onload = () => {
                            resolve(image);
                        };
                    });
                    image.src = uri;
                    return promise;
                }
                arg.on('child_changed', async snap => {
                    try {
                        const val = "data:image/jpeg;base64," + snap.val();
                        if (typeof snap.val() !== 'number') {
                            const canvas = createCanvas(480, 640);
                            const ctx = canvas.getContext('2d');
                            const image: Image = await loadImage(val);
                            ctx.drawImage(image, 0, 0);
                            await $this.pose.loadAndPredict(canvas, snap.ref.parent?.parent?.key as string);
                            db.ref('room/' + snap.ref.parent?.parent?.key + '/camera').update({ isReady: 1 });
                        } else {
                            console.log(arg.parent?.key);
                            console.log(val);
                        }
                    } catch (error) {
                        console.log(error);
                    }
                });

                arg.off('child_changed', async snap => {
                    try {
                        const val = "data:image/jpeg;base64," + snap.val();
                        if (typeof snap.val() !== 'number') {
                            const canvas = createCanvas(480, 640);
                            const ctx = canvas.getContext('2d');
                            const image: Image = await loadImage(val);
                            ctx.drawImage(image, 0, 0);
                            await $this.pose.loadAndPredict(canvas, snap.ref.parent?.parent?.key as string);
                            db.ref('room/' + snap.ref.parent?.parent?.key + '/camera').update({ isReady: 1 });
                        } else {
                            console.log(arg.parent?.key);
                            console.log(val);
                        }
                    } catch (error) {
                        console.log(error);
                    }
                });
                return Array.prototype.push.apply(this);
            };

            (await db.ref('room').get()).forEach(snap => {
                try {
                    const camera = snap.child('camera').ref;
                    this.camera.push(camera);
                } catch (e) {
                    console.log(e);
                }
            });
        } catch (e) {
            console.error(e);
        }
    }
}