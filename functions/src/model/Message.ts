export default interface message {
    id:string,
    sender: string,
    receiver: string,
    message: string,
    sendAt: string,
    isRead: boolean,
    typeRequest:string,
    status:string,
}