import {Injectable} from '@nestjs/common';
import {Room} from './entities/room.entity';
import {Server} from 'socket.io';
import {SocketData} from '../types/socket-data.type';
import {MovementDto} from './dto/movement.dto';
import {OptionsOfCardsDto} from './dto/options-of-cards.dto';
import {GameService} from '../abstracts/game-service.abstract';
import {RoomOptions} from './types/room-options.type';

@Injectable()
export class SpyService extends GameService<Room, RoomOptions> {
	constructor() { super('SpyService'); }

	createRoom(server: Server): string {
    	const room = new Room(server);
    	this._rooms.push(room);
    	this._logger.log(`Room ${room.id} created`);
    	return room.id;
	}

	moveCards(movement: MovementDto, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.moveCards(movement, user);
	}

	captureCard(cardId: number, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.captureCard(cardId, user);
	}

	askCard(cardId: number, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.askCard(cardId, user);
	}

	changeRoomOptionsOfCards(optionsOfCardsDto: OptionsOfCardsDto, socketData: SocketData): boolean {
		if (!socketData.roomId) return false;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return false;
		return room.setOptionsOfCards(optionsOfCardsDto.optionsOfCards, optionsOfCardsDto.ownerKey);
	}

	requestRoomOptionsOfCards(socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		return room.requestOptionsOfCards(user);
	}
}
