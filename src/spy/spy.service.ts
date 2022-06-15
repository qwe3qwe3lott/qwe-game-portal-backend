import {Injectable, Logger, OnModuleInit} from '@nestjs/common';
import {Room} from './entities/room.entity';
import {Server} from 'socket.io';
import {SocketData} from './types/socket-data.type';
import {User} from './types/user.type';
import {MovementDto} from './dto/movement.dto';
import {CardPack} from './types/card-pack.type';
import {vergilPack} from './util/vergil-pack.util';

@Injectable()
export class SpyService implements OnModuleInit {
	private readonly logger: Logger = new Logger('SpyService');
	private readonly _rooms: Room[] = []
	private readonly _users: User[] = []
	private readonly _cardPacks: CardPack[] = []

	onModuleInit(): void {
		this._cardPacks.push(vergilPack);
	}

	addUser(user: User) {
		this._users.push(user);
	}

	removeUser(socketData: SocketData) {
		const userId = this._users.findIndex(user => user.id === socketData.userId);
		if (userId === -1) return;
		if (socketData.roomId) {
			const room = this._rooms.find(room => room.id === socketData.roomId);
			if (!room) return;
			room.kick(this._users[userId]);
		}
		this._users.splice(userId, 1);
	}

	createRoom(server: Server): string {
    	const room = new Room(server, this._cardPacks);
    	this._rooms.push(room);
    	this.logger.log(`Room ${room.id} created`);
    	return room.id;
	}

	changeNickname(nickname: string, socketData: SocketData): boolean {
		const user = this._users.find(user => user.id === socketData.userId);
		if (!user) return false;
		if (nickname.length < 3 || nickname.length > 30) return false;
		if (socketData.roomId) {
			const room = this._rooms.find(room => room.id === socketData.roomId);
			if (!room) return false;
			return room.changeNickname(user, nickname);
		} else {
			user.nickname = nickname;
			return true;
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
}
