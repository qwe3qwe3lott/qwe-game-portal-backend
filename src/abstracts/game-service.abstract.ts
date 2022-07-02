import {Injectable, Logger} from '@nestjs/common';
import {Server} from 'socket.io';
import {SocketData} from '../types/socket-data.type';
import {User} from '../types/user.type';
import { Interval } from '@nestjs/schedule';
import {IDeletableRoom} from '../interfaces/deletable-room.interface';
import {SocketWithData} from '../types/socket-with-data.type';
import {GameEvents} from '../enums/game-events.enum';
import {GameRoom} from './game-room.abstract';
import {GamePlayer} from './game-player.abstract';
import {RoomState} from '../types/room-state.type';

@Injectable()
export abstract class GameService<R extends GameRoom<GamePlayer, RoomState<GamePlayer>>> {
    private static readonly SECONDS_BETWEEN_DELETES = 900;
    private static readonly FAILED_CHECKS_COUNT_TO_DELETE = 3;
    protected readonly _logger: Logger
	protected readonly _rooms: R[]
	protected readonly _users: User[]

	protected constructor(name: string) {
    	this._logger = new Logger(name);
    	this._rooms = [];
    	this._users = [];
	}

    @Interval(GameService.SECONDS_BETWEEN_DELETES * 1000)
	deleteRooms(): void {
    	const roomsToDelete: IDeletableRoom[] = [];
    	for (const room of this._rooms) {
    		if (room.checkActivity()) break;
    		if (room.increaseFailedChecksCount() >= GameService.FAILED_CHECKS_COUNT_TO_DELETE) roomsToDelete.push(room);
    	}
    	for (const room of roomsToDelete) {
    		const roomIndex = this._rooms.findIndex(r => r === room);
    		if (roomIndex === -1) break;
    		this._rooms.splice(roomIndex, 1);
    		room.delete();
    	}
	}

    public addUser(socket: SocketWithData) {
    	const nickname = `User ${socket.id.substring(0, 6)}`;
    	const user: User = { id: socket.id, socket, nickname};
    	socket.data = { userId: socket.id, roomId: null };
    	this._users.push(user);
    	socket.emit(GameEvents.GET_NICKNAME, { nickname, force: false });
    	this._logger.log('in ' + socket.id);
    }

    public removeUser(socketData: SocketData) {
    	const userIndex = this._users.findIndex(user => user.id === socketData.userId);
    	if (userIndex === -1) return;
    	if (socketData.roomId) {
    		const room = this._rooms.find(room => room.id === socketData.roomId);
    		if (room) room.kick(this._users[userIndex]);
    	}
    	this._users.splice(userIndex, 1);
    	this._logger.log('out ' + socketData.userId);
    }

    public abstract createRoom(server: Server): string

    public changeNickname(nickname: string, socketData: SocketData): string {
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

    public checkRoom(roomId: string): boolean {
    	const roomIndex = this._rooms.findIndex(room => room.id === roomId);
    	return roomIndex !== -1;
    }

    public joinRoom(roomId: string, socketData: SocketData): boolean {
    	if (socketData.roomId) return false;
    	const room = this._rooms.find(room => room.id === roomId);
    	const user = this._users.find(user => user.id === socketData.userId);
    	if (!room || !user) return false;
    	socketData.roomId = room.id;
    	return room.join(user);
    }

    public become(becomePlayer: boolean, socketData: SocketData): boolean {
    	if (!socketData.roomId) return false;
    	const room = this._rooms.find(room => room.id === socketData.roomId);
    	const user = this._users.find(user => user.id === socketData.userId);
    	if (!room || !user) return false;
    	return room.become(user, becomePlayer);
    }

    public leaveRoom(socketData: SocketData): void {
    	if (!socketData.roomId) return;
    	const room = this._rooms.find(room => room.id === socketData.roomId);
    	const user = this._users.find(user => user.id === socketData.userId);
    	if (!room || !user) return;
    	room.kick(user);
    	socketData.roomId = null;
    }

    public startGame(ownerKey: string, socketData: SocketData): void {
    	if (!socketData.roomId) return;
    	const room = this._rooms.find(room => room.id === socketData.roomId);
    	const user = this._users.find(user => user.id === socketData.userId);
    	if (!room || !user) return;
    	room.start(ownerKey);
    }

    public stopGame(ownerKey: string, socketData: SocketData): void {
    	if (!socketData.roomId) return;
    	const room = this._rooms.find(room => room.id === socketData.roomId);
    	const user = this._users.find(user => user.id === socketData.userId);
    	if (!room || !user) return;
    	room.stop(ownerKey);
    }

    public pauseGame(ownerKey: string, socketData: SocketData): void {
    	if (!socketData.roomId) return;
    	const room = this._rooms.find(room => room.id === socketData.roomId);
    	const user = this._users.find(user => user.id === socketData.userId);
    	if (!room || !user) return;
    	room.pause(ownerKey);
    }

    public resumeGame(ownerKey: string, socketData: SocketData): void {
    	if (!socketData.roomId) return;
    	const room = this._rooms.find(room => room.id === socketData.roomId);
    	const user = this._users.find(user => user.id === socketData.userId);
    	if (!room || !user) return;
    	room.resume(ownerKey);
    }

    public requestTimer(socketData: SocketData): void {
    	if (!socketData.roomId) return;
    	const room = this._rooms.find(room => room.id === socketData.roomId);
    	const user = this._users.find(user => user.id === socketData.userId);
    	if (!room || !user) return;
    	room.requestTimer(user);
    }
}
