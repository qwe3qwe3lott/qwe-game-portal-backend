import {Injectable, Logger} from '@nestjs/common';
import {Room} from './entities/room.entity';
import {Server} from 'socket.io';
import {SocketData} from '../types/socket-data.type';
import {User} from '../types/user.type';
import {MovementDto} from './dto/movement.dto';
import {OptionsDto} from './dto/options.dto';
import { Interval } from '@nestjs/schedule';
import {IDeletableRoom} from '../interfaces/deletable-room.interface';
import {OptionsOfCardsDto} from './dto/options-of-cards.dto';
import {IGameService} from '../interfaces/game-service.interface';
import {Events} from './enums/events.enum';
import {SocketWithData} from '../types/socket-with-data.type';

@Injectable()
export class SpyService implements IGameService {
	private static SECONDS_BETWEEN_DELETES = 900;
	private static FAILED_CHECKS_COUNT_TO_DELETE = 3;
	private readonly _logger: Logger = new Logger('SpyService');
	private readonly _rooms: Room[] = []
	private readonly _users: User[] = []

	@Interval(SpyService.SECONDS_BETWEEN_DELETES * 1000)
	deleteRooms(): void {
		const roomsToDelete: IDeletableRoom[] = [];
		for (const room of this._rooms) {
			if (room.checkActivity()) break;
			if (room.increaseFailedChecksCount() >= SpyService.FAILED_CHECKS_COUNT_TO_DELETE) roomsToDelete.push(room);
		}
		for (const room of roomsToDelete) {
			const roomIndex = this._rooms.findIndex(r => r === room);
			if (roomIndex === -1) break;
			this._rooms.splice(roomIndex, 1);
			room.delete();
		}
	}

	addUser(socket: SocketWithData) {
		const nickname = `User ${socket.id.substring(0, 6)}`;
		const user: User = { id: socket.id, socket, nickname};
		socket.data = { userId: socket.id, roomId: null };
		this._users.push(user);
		socket.emit(Events.GET_NICKNAME, { nickname, force: false });
		this._logger.log('in ' + socket.id);
	}

	removeUser(socketData: SocketData) {
		const userIndex = this._users.findIndex(user => user.id === socketData.userId);
		if (userIndex === -1) return;
		if (socketData.roomId) {
			const room = this._rooms.find(room => room.id === socketData.roomId);
			if (room) room.kick(this._users[userIndex]);
		}
		this._users.splice(userIndex, 1);
		this._logger.log('out ' + socketData.userId);
	}

	createRoom(server: Server): string {
    	const room = new Room(server);
    	this._rooms.push(room);
    	this._logger.log(`Room ${room.id} created`);
    	return room.id;
	}

	changeNickname(nickname: string, socketData: SocketData): string {
		const user = this._users.find(user => user.id === socketData.userId);
		if (!user) return '';
		if (user.nickname === nickname) return '';
		if (nickname.length < 3) return '';
		if (nickname.length > 30) nickname = nickname.substring(0, 30);
		if (socketData.roomId) {
			const room = this._rooms.find(room => room.id === socketData.roomId);
			if (!room) return '';
			return room.changeNickname(user, nickname);
		} else {
			user.nickname = nickname;
			return nickname;
		}
	}

	checkRoom(roomId: string): boolean {
		const id = this._rooms.findIndex(room => room.id === roomId);
		return id !== -1;
	}

	joinRoom(roomId: string, socketData: SocketData): boolean {
		if (socketData.roomId) return false;
		const room = this._rooms.find(room => room.id === roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return false;
		socketData.roomId = room.id;
		return room.join(user);
	}

	become(becomePlayer: boolean, socketData: SocketData): boolean {
		if (!socketData.roomId) return false;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return false;
		return room.become(user, becomePlayer);
	}

	leaveRoom(socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.kick(user);
		socketData.roomId = null;
	}

	startGame(ownerKey: string, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.start(ownerKey);
	}

	stopGame(ownerKey: string, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.stop(ownerKey);
	}

	pauseGame(ownerKey: string, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.pause(ownerKey);
	}

	resumeGame(ownerKey: string, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.resume(ownerKey);
	}

	moveCards(movement: MovementDto, socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.moveCards(movement, user);
	}

	requestTimer(socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		room.requestTimer(user);
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

	changeRoomOptions(optionsDto: OptionsDto, socketData: SocketData): boolean {
		if (!socketData.roomId) return false;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return false;
		return room.setOptions(optionsDto.options, optionsDto.ownerKey);
	}

	changeRoomOptionsOfCards(optionsOfCardsDto: OptionsOfCardsDto, socketData: SocketData): boolean {
		if (!socketData.roomId) return false;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return false;
		return room.setOptionsOfCards(optionsOfCardsDto.optionsOfCards, optionsOfCardsDto.ownerKey);
	}

	requestRoomOptions(socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		return room.requestOptions(user);
	}

	requestRoomOptionsOfCards(socketData: SocketData): void {
		if (!socketData.roomId) return;
		const room = this._rooms.find(room => room.id === socketData.roomId);
		const user = this._users.find(user => user.id === socketData.userId);
		if (!room || !user) return;
		return room.requestOptionsOfCards(user);
	}
}
