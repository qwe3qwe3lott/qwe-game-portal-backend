import {v4 as uuidv4} from 'uuid';
import {Member} from '../types/member.type';
import {Logger} from '@nestjs/common';
import {Server} from 'socket.io';
import {IDeletableRoom} from '../interfaces/deletable-room.interface';
import {Flow} from '../entities/flow.entity';
import {GamePlayer} from './game-player.abstract';
import {RoomState} from '../types/room-state.type';
import {User} from '../types/user.type';
import {RoomStatuses} from '../enums/room-statuses.enum';
import {GameEvents} from '../enums/game-events.enum';
import {LogRecord} from '../types/log-record.type';

export abstract class GameRoom<P extends GamePlayer, S extends RoomState<P>> implements IDeletableRoom {
    protected static readonly ADDITIONAL_NICKNAME_CHAR = ')'
    protected readonly _id: string; public get id() { return this._id; }
    protected readonly _logger: Logger
    protected _owner: Member | null
    protected _members: Member[]
    private get membersPayload() { return this._members.map(member => ({ isPlayer: member.isPlayer, nickname: member.user.nickname })); }
    protected get playersAmongMembers() { return this._members.filter(member => member.isPlayer); }
    protected _ownerKey: string | null
    protected readonly _server: Server
    protected get channel() { return this._server.to(this._id); }
    private _failedChecksCount: number
    protected readonly _flow: Flow
    protected _state?: S
    protected get currentPlayer() { return this._state.players[0]; }
    protected abstract get playersPayload(): unknown[]
    protected _status: RoomStatuses
    protected get isRunning() { return this._status === RoomStatuses.IS_RUNNING || this._status === RoomStatuses.ON_PAUSE; }
    protected get isOnPause() { return this._status === RoomStatuses.ON_PAUSE; }
    protected abstract get restrictionsToStart(): string[]

    protected constructor(server: Server) {
    	this._server = server;
    	this._id = uuidv4();
    	this._status = RoomStatuses.IDLE;
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

    public requestTimer(user: User): void {
    	if (!this.isRunning || !user) return;
    	this.sendTimerToUser(user.id);
    }

    protected sendMembersToAll() { this.channel.emit(GameEvents.GET_MEMBERS, this.membersPayload); }
    protected sendMembersToUser(userId: string) { this._server.to(userId).emit(GameEvents.GET_MEMBERS, this.membersPayload); }

    protected sendLogsToAll() { this.channel.emit(GameEvents.GET_ALL_LOG_RECORDS, this._state.logs); }
    protected sendLogsToUser(userId: string) { this._server.to(userId).emit(GameEvents.GET_ALL_LOG_RECORDS, this._state.logs); }

    protected sendLogRecordToAll(record: LogRecord) { this.channel.emit(GameEvents.GET_LOG_RECORD, record); }

    protected sendPlayersToAll() { this.channel.emit(GameEvents.GET_PLAYERS, this.playersPayload); }
    protected sendPlayersToUser(userId: string) { this._server.to(userId).emit(GameEvents.GET_PLAYERS, this.playersPayload); }

    protected sendTimerToAll() { this.channel.emit(GameEvents.GET_TIMER, this._flow.timer); }
    protected sendTimerToUser(userId: string) { this._server.to(userId).emit(GameEvents.GET_TIMER, this._flow.timer); }

    protected sendRoomStatusToAll() { this.channel.emit(GameEvents.GET_ROOM_STATUS, this._status); }
    protected sendRoomStatusToUser(userId: string) { this._server.to(userId).emit(GameEvents.GET_ROOM_STATUS, this._status); }

    protected sendActFlagToAll(flag: boolean) { this.channel.emit(GameEvents.GET_ACT_FLAG, flag); }
    protected sendActFlagToUser(userId: string, flag: boolean) { this._server.to(userId).emit(GameEvents.GET_ACT_FLAG, flag); }

    protected sendRestrictionsToStartToUser(userId: string) { this._server.to(userId).emit(GameEvents.GET_RESTRICTIONS_TO_START, this.restrictionsToStart); }

    protected sendOwnerKeyToUser(userId: string) { this._server.to(userId).emit(GameEvents.GET_OWNER_KEY, this._ownerKey); }

    protected sendNicknameToUser(userId: string, nickname: string, force: boolean) { this._server.to(userId).emit(GameEvents.GET_NICKNAME, { nickname, force }); }
}