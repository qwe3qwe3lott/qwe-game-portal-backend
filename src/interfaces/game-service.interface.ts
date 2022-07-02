import {SocketWithData} from '../types/socket-with-data.type';
import {SocketData} from '../types/socket-data.type';

export interface IGameService {
    addUser: (socket: SocketWithData) => void
    removeUser: (socketData: SocketData) => void
}