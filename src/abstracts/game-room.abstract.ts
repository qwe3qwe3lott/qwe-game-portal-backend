import {v4 as uuidv4} from 'uuid';
import {Member} from '../types/member.type';
import {Logger} from '@nestjs/common';
import {Server} from 'socket.io';
import {IDeletableRoom} from '../interfaces/deletable-room.interface';
import {Flow} from '../entities/flow.entity';
import {GamePlayer} from './game-player.abstract';
import {RoomState} from '../types/room-state.type';
import {User} from '../types/user.type';

export abstract class GameRoom<P extends GamePlayer, S extends RoomState<P>> implements IDeletableRoom {
    protected static ADDITIONAL_NICKNAME_CHAR = ')'
    protected readonly _id: string; public get id() { return this._id; }
    protected _logger: Logger
    protected _owner: Member | null
    protected _members: Member[]
    protected get playersAmongMembers() { return this._members.filter(member => member.isPlayer); }
    protected _ownerKey: string | null
    protected _server: Server
    protected get channel() { return this._server.to(this._id); }
    private _failedChecksCount: number
    protected _flow: Flow
    protected _state?: S
    protected get currentPlayer() { return this._state.players[0]; }
    protected abstract get isRunning(): boolean
    protected abstract get isOnPause(): boolean

    protected constructor(server: Server) {
    	this._server = server;
    	this._id = uuidv4();
    	this._owner = null;
    	this._ownerKey = uuidv4();
    	this._members = [];
    	this._failedChecksCount = 0;
    	this._logger = new Logger(`Room ${this._id}`);
    	this._flow = new Flow();
    }

    public checkActivity(): boolean { return this._members.length > 0; }
    public increaseFailedChecksCount(): number { return ++this._failedChecksCount; }
    public abstract delete(): void

    protected nextCurrentPlayer() { this._state.players.push(this._state.players.shift()); }

    public abstract start(ownerKey: string): void
    public abstract stop(ownerKey: string): void
    public abstract pause(ownerKey: string): void
    public abstract resume(ownerKey: string): void

    public abstract join(user: User): boolean
    public abstract become(user: User, becomePlayer: boolean): boolean
    public abstract kick(user: User): void

    public changeNickname(user: User, nickname: string): string {
    	if (this.isRunning) return '';
    	while (this._members.some(member => member.user.nickname === nickname)) nickname += GameRoom.ADDITIONAL_NICKNAME_CHAR;
    	user.nickname = nickname;
    	this.sendMembersToAll();
    	return nickname;
    }

    protected abstract sendMembersToAll(): void
    protected abstract sendMembersToUser(userId: string): void
}