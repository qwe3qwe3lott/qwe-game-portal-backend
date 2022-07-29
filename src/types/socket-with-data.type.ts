import {Socket} from 'socket.io';
import {SocketData} from './socket-data.type';

export type SocketWithData = Socket & { data: SocketData }