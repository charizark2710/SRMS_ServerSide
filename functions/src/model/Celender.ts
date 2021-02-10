import { db } from '../connector/configFireBase'

interface Celender {
    date: string,
    room: string,
    userId: string,
    userName: string,
    reason: string
}

interface StaticCelender extends Celender {
    slot: number
}

interface DynamicCelender extends Celender {
    from: string,
    to: string,
}

const celenderSchema = db.ref('celender');

export { Celender, StaticCelender, DynamicCelender, celenderSchema }

