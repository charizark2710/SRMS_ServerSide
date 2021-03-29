import child_process from 'child_process';
import { db } from '../connector/configFireBase'
import { Canvas, Image, createCanvas } from 'canvas'
import { testPose } from '../TensorFlow/testPose'
import { Room } from '../model/Room'
import * as posenet from '@tensorflow-models/posenet'

export class mediaServer {
    spawn = child_process.spawn;
    pose: testPose;
    cRoom: any;
    constructor(net: posenet.PoseNet) {
        this.pose = new testPose(net);
        this.cRoom = null;
    }

    async loadImage(uri: string) {
        const image = new Image();
        const promise = new Promise<Image>((resolve, reject) => {
            image.onload = () => {
                resolve(image);
            };
            image.onerror = (e) => {
                console.log(e);
            }
        });
        image.src = uri;

        return promise;
    }

    async dectectMedia() {
        try {
            const $this = this;
            db.ref('room').on('child_changed', async (snap) => {
                try {
                    const room = snap.key;
                    const val = snap.val();
                    const device = val.device;
                    if (JSON.stringify(device) !== JSON.stringify(this.cRoom)) {
                        this.cRoom = device;
                    } else {
                        const camera = val.camera;
                        if (camera.isReady !== 0) {
                            const canvas = createCanvas(480, 640);
                            const ctx = canvas.getContext('2d');
                            const image: Image = await $this.loadImage(camera.frame);

                            ctx.drawImage(image, 0, 0);
                            image.onerror = () => {
                                throw new Error('Failed to load image');
                            }
                            await $this.pose.loadAndPredict(canvas);
                            snap.child('camera').ref.set({ frame: "", isReady: 1 });
                        } else {
                            console.log(snap.val());
                        }
                    }
                } catch (e) {
                    db.ref('room').set({ frame: "", isReady: 1 });
                    console.log(e);
                }
            });

            db.ref('room').off('child_changed', async (snap) => {
                try {
                    const room = snap.key;
                    const camera = snap.val().camera;
                    if (camera.isReady !== 0) {
                        const canvas = createCanvas(480, 640);
                        const ctx = canvas.getContext('2d');

                        const image: Image = await $this.loadImage(snap.val());

                        ctx.drawImage(image, 0, 0);
                        image.onerror = () => {
                            throw new Error('Failed to load image');
                        }
                        await $this.pose.loadAndPredict(canvas);
                        db.ref('room').set({ frame: "", isReady: 1 });
                    } else {
                        console.log(snap.val());
                    }
                } catch (e) {
                    db.ref('room').set({ frame: "", isReady: 1 });
                    console.log(e);
                }
            });
        } catch (e) {
            console.error(e);
            db.ref('room').off();
        }
    }
}