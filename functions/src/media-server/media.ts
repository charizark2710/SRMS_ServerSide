import child_process from 'child_process';
import { db } from '../connector/configFireBase'
import { Canvas, Image, createCanvas } from 'canvas'
import { testPose } from '../TensorFlow/testPose'
import * as posenet from '@tensorflow-models/posenet'

export class mediaServer {
    spawn = child_process.spawn;
    pose: testPose;

    constructor(net: posenet.PoseNet) {
        this.pose = new testPose(net);
    }

    async loadImage(uri: string) {
        let image = new Image();
        const promise = new Promise<Image>((resolve, reject) => {
          image.onload = () => {
            resolve(image);
          };
        });
        image.src = uri;
      
        return promise;
      }

    dectectMedia = async (isOk: boolean) => {
        try {
            db.ref('video').on('child_changed', async (snap) => {
                try {
                    if (typeof snap.val() != 'boolean') {
                        if (isOk === false) {
                            const canvas = createCanvas(480, 640);
                            const ctx = canvas.getContext('2d');

                            const image: Image = await this.loadImage(snap.val());

                            ctx.drawImage(image, 0,0);
                            image.onerror = () => {
                                throw new Error('Failed to load image');
                            }
                            await this.pose.loadAndPredict(canvas);
                            db.ref('video').set({ frame: "", isDone: true });
                        }
                    } else {
                        db.ref('video').set({ frame: "", isDone: true });
                        console.log(snap.val());
                    }
                } catch (e) {
                    db.ref('video').set({ frame: "", isDone: true });
                    console.log(e);
                }
            });

            db.ref('video').off('child_changed', async (snap) => {
                if (typeof snap.val() != 'boolean') {
                    if (isOk === false) {
                        const image = new Image();
                        const canvas = createCanvas(480, 640);
                        const ctx = canvas.getContext('2d');
                        image.onload = () => {
                            ctx.drawImage(image, 0, 0);
                        }
                        image.onerror = () => {
                            throw new Error('Failed to load image');
                        }
                        image.src = snap.val();
                        await this.pose.loadAndPredict(canvas);
                        db.ref('video').set({ frame: "", isDone: true });
                    }
                } else {
                    console.log(snap.val());
                }
            });
        } catch (e) {
            console.error(e);
            db.ref('video').off();
        }


    }
}
