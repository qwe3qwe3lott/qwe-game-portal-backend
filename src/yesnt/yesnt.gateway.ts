import {WebSocketGateway, WebSocketServer} from '@nestjs/websockets';
import {YesntService} from './yesnt.service';
import {Server} from 'socket.io';
import {SocketWithData} from '../types/socket-with-data.type';

@WebSocketGateway({
	namespace: 'yesnt',
	cors: { origin: '*' }
})
export class YesntGateway {
	@WebSocketServer()
	server: Server;

	constructor(private readonly _yesntService: YesntService) {}

	handleConnection(socket: SocketWithData) {
		this._yesntService.addUser(socket);
	}

	handleDisconnect(socket: SocketWithData) {
		this._yesntService.removeUser(socket.data);
	}
}
