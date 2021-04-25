export function getDate(now: Date) {
    const time = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
        now.getUTCHours() + 7, now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());;

    return time;
}

export default function getUTC(now: Date) {
    const time = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
        now.getUTCHours() + 7, now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());;
    const tempM = (time.getMonth() + 1).toString();
    const tempD = time.getDate().toString();
    const year = time.getFullYear().toString();
    const month = tempM.length === 2 ? tempM : '0' + tempM;
    const date = tempD.length === 2 ? tempD : '0' + tempD;
    const tempH = time.getHours().toString();
    const tempMin = time.getMinutes().toString();
    const tempSec = time.getSeconds().toString();
    const tempMs = time.getMilliseconds().toString();
    const hours = tempH.length === 2 ? tempH : '0' + tempH;
    const min = tempMin.length === 2 ? tempMin : '0' + tempMin;
    const sec = tempSec.length === 2 ? tempSec : '0' + tempSec;
    tempMs.length === 1 ? tempMs + '0' : tempMs;
    const ms = tempMs.length === 3 ? tempMs : '0' + tempMs;
    console.log(hours.concat(min, sec, ms))

    return year.concat(month, date) + "-" + hours.concat(min, sec, ms);
}

export function formatDate(date: string) {
    return (date as string).substring(0, 4).concat('-', (date as string).substring(4, 6), '-', (date as string).substring(6));
}

export function formatTime(time: string) {
    return (time as string).substring(0, 2).concat(':', (time as string).substring(2, 4));
}