import { userSchema } from '../model/UserModel'
import * as express from 'express';
import { adminAuth, db } from "../connector/configFireBase"
import bycrypt from 'bcryptjs'
import auth from './Authenticate';
import authorized from './Authorized';
import notification from './NotificationManagement'
import { dropout } from '@tensorflow/tfjs-node';

export class BannedUserController {
    public router = express.Router();
    path = '/blackList'
    constructor() {
        this.init();
    }

    init() {
        // this.router.patch(this.path + "/edit/:id", auth, authorized({ hasRole: ['admin'] }), this.editUser);
        // this.router.delete(this.path + "/delete/:id", auth, authorized({ hasRole: ['admin'] }), this.deleteUser);
        // this.router.patch(this.path + "/banned/:id/restore", auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.restoreUser);
        // this.router.get(this.path + '/:id', auth, authorized({ hasRole: ['admin', 'student', 'lecture'] }), this.getUser);
        this.router.patch(this.path+'/banUser', this.banUser);
        this.router.patch(this.path+'/unbanUser', this.unbanUser);
        this.router.get(this.path+'/banned', this.getBannedUsers);
        this.router.get(this.path+'/unbanned', this.getUnbannedUsers);
    }


    banUser=(request:express.Request, response: express.Response)=>{
        try {
            var data=request.body;//list banning users
            data = JSON.parse(data);
            if(data){
                data.forEach(async (user:any) => {
                    var userId=user.split('@')[0] || ' ';
                    await db.ref('BannedUser').child(userId).update({
                        isBanned:true,
                        bannedAt:(new Date()).toString(),
                    })
                });
            }
            return response.status(200).json('ok')            
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }

    getBannedUsers=async (request: express.Request, response: express.Response) => {
        try {
            var result:any[] = [];
            (await db.ref('BannedUser').get()).forEach(snapshot => {
                const value = snapshot.val();
                if(value.isBanned){
                    result.push(value);
                }
                
            });
            return response.status(200).json(result)            
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }

    getUnbannedUsers=async (request: express.Request, response: express.Response) => {
        try {
            var result:any[] = [];
            (await db.ref('BannedUser').get()).forEach(snapshot => {
                const value = snapshot.val();
                if(!value.isBanned){
                    result.push(value.email);
                }
                
            });
            return response.status(200).json(result)            
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }

    unbanUser=async(request:express.Request, response: express.Response)=>{
        try {
            var data=request.body;//list banning users
                var userId=data.split('@')[0] || ' ';
                db.ref('BannedUser').child(userId).update({
                    isBanned:false,
                    bannedAt:null,
                })
            return response.status(200).json(data)            
        } catch (error) {
            console.log(error);
            response.status(500).send(error);
        }
    }
}
