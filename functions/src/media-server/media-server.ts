import * as express from 'express';
import child_process from 'child_process';
import { db } from '../connector/configFireBase'
import * as Canvas from 'canvas'

export class mediaServer {
    public router = express.Router();

    spawn = child_process.spawn;
    constructor() {
        this.init();
    }

    init() {
        this.router.get('/testMedia', this.test);
    }

    test = (request: express.Request, response: express.Response) => {
        const canvas = Canvas.createCanvas(480, 640);
        const ctx = canvas.getContext('2d');
        try {
            db.ref('video').on("child_added", (snap) => {
                const image = new Canvas.Image();
                image.src = snap.val();
                ctx.drawImage(image, 0, 0);
            });
            db.ref('video').on("child_changed", (snap) => {
                const image = new Canvas.Image();
                image.src = snap.val();
                ctx.drawImage(image, 0, 0);
            });
            response.send('<img src="' + canvas.toDataURL() + '" />');

        } catch (error) {
            response.status(500).send(error);

        }


    }
}