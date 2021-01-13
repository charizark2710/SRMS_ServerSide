import * as express from 'express';
import child_process from 'child_process';
import io, { Socket } from 'socket.io';
import http from 'http';
import path from 'path';


export class mediaServer {
    spawn = child_process.spawn;
    httpServer: http.Server;
    ioServer: io.Server;
    constructor(app: express.Application) {
        this.httpServer = http.createServer(app);
        this.httpServer.listen(5001, () => console.log("Socket running in port " + 5001))
        this.ioServer = new io.Server(this.httpServer, {
            cookie: true,
            cors: {
                origin: "http://localhost:3000",
                credentials: true,
                methods: ['GET', 'PUT', 'POST'],
                allowedHeaders: 'X-Requested-With,content-type'
            },
        });
    }

    setCanvas() {
        this.spawn(path.join(__dirname, '../../../ffmpeg/bin/ffmpeg'), ['h']).on('error', e => {
            console.error("FFMpeg not found in system cli; please install ffmpeg properly or make a softlink to ./!" + '\n' + e);
            process.exit(-1);
        });

        this.ioServer.on('connection', (socket: Socket) => {
            console.log(socket.id + ": connected");
            socket.emit('message', 'Hello from mediarecorder-to-rtmp server!');
            socket.emit('message', 'Please set rtmp destination before start streaming.');
            socket.on('frame', (data)=>{
            });
        });


    }


}