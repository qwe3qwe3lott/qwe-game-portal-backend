import {SocketWithData} from './socket-with-data.type';

export type User = {
    id: string
    nickname: string
    socket: SocketWithData
}