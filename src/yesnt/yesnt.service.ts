import {Injectable} from '@nestjs/common';
import {Room} from './entities/room.entity';
import {GameService} from '../abstracts/game-service.abstract';
import {Server} from 'socket.io';
import {RoomOptions} from './types/room-options.type';
import {RoomStatus} from './types/room-status.type';
import {SocketData} from '../types/socket-data.type';
import {Answers} from './enums/answers.enum';


@Injectable()
export class YesntService extends GameService<Room, RoomOptions, RoomStatus> {
	constructor() { super('YesntService'); }

	public createRoom(server: Server): string {
		const room = new Room(server);
		this._rooms.push(room);
		this._logger.log(`Room ${room.id} created`);
		return room.id;
	}

	public ask(question: string, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.ask(question, user);
	}

	public skipAsk(socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.skipAsk(user);
	}

	public answer(answer: Answers, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.answer(answer, user);
	}
}
