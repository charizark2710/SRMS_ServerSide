import * as express from 'express';
import { Celender, StaticCelender, DynamicCelender, celenderSchema } from '../model/Celender'
import { adminAuth } from "../connector/configFireBase"

export default class CelenderController {
    router = express.Router();
    url = "/celender";
    constructor() {
        this.init();
    }

    init() {
        this.router.get(this.url + '/view', this.viewCelender);
    }

    viewCelender = async (request: express.Request, response: express.Response) => {
        const selectedDate: Array<string> = request.body.selectedDate;
        let result: any[] = [];
        if (selectedDate) {
            selectedDate.forEach(async date => {
                let value = (await celenderSchema.child('dynamic').child(date).get()).val();
                result.push(value);
                value = (await celenderSchema.child('static').child(date).get()).val();
                result.push(value);
            });
            return response.send(result);
        } else {
            const value: Celender = (await celenderSchema.get()).val();
            response.send(value);
        }
    }
}