import {User} from '../types/user.type';
import { v4 as uuidv4 } from 'uuid';
import {Server} from 'socket.io';
import {SpyWSEvents} from '../enums/spy-ws-events.enum';
import {Member} from '../types/member.type';
import {Logger} from '@nestjs/common';
import {RoomOptions} from '../types/room-options.type';
import {State} from '../types/state.type';
import {Player} from './player.entity';
import {FieldCard} from '../types/field-card.type';
import {Field} from './field.entity';
import {randomElement} from '../util/random-element.util';
import {MovementDto} from '../dto/movement.dto';
import {Flow} from './flow.entity';

enum Status {
	IDLE,
	IS_RUNNING,
	ON_PAUSE
}

// Когда запускается таймер, стартует setTimeOut и его id записывается в переменную, затем при вызове метода хода пользователя, timeout реджектится
// Создать тип Player

export class Room {
	private static ADDITIONAL_NICKNAME_CHAR = ')'
	private _logger: Logger
	private readonly _id: string; public get id() { return this._id; }
    private _ownerKey: string | null
    private _owner: Member | null
    private _members: Member[]
    private get membersPayload() { return this._members.map(member => ({ isPlayer: member.isPlayer, nickname: member.user.nickname })); }
    private get playersAmongMembers() { return this._members.filter(member => member.isPlayer); }
    private get playersConditionToStart() {
    	const playersAmongMembersCount = this.playersAmongMembers.length;
    	return playersAmongMembersCount >= this._options.minPlayers && playersAmongMembersCount <= this._options.maxPlayers;
    }
	private _server: Server
	private get channel() { return this._server.to(this._id); }
	private _options: RoomOptions
	private _status: Status
	private get isRunning() { return this._status === Status.IS_RUNNING || this._status === Status.ON_PAUSE; }
	private get isOnPause() { return this._status === Status.ON_PAUSE; }
	private _state?: State
	private get currentPlayer() { return this._state.players[0]; }
	private get playersPayload() {
		return this._state.players.map(player => ({
			id: player.id,
			nickname: player.nickname
		}));
	}
	private _flow: Flow
	private _timeoutAction: () => void

	constructor(server: Server) {
    	this._id = uuidv4();
    	this._owner = null;
    	this._ownerKey = uuidv4();
    	this._server = server;
    	this._members = [];
    	this._logger = new Logger(`Room ${this._id}`);
    	this._options = {
    		minPlayers: 2,
    		maxPlayers: 5,
			rows: 5,
			columns: 6,
			secondsToAct: 15
		};
    	this._status = Status.IDLE;
    	this._flow = new Flow();
    	this._timeoutAction = () => {
			this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_FLAG, false);
			this.nextCurrentPlayer();
			this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_FLAG, true);
			const isRow = Math.random() < 0.5;
			this._state.field.move({
				isRow,
				forward: Math.random() < 0.5,
				id: Math.floor(Math.random() * (isRow ? this._options.rows : this._options.columns)) + 1
			});
			this.channel.emit(SpyWSEvents.GET_FIELD_CARDS, this._state.field.cards);
			this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
			this.channel.emit(SpyWSEvents.GET_TIMER, this._flow.timer);
		};
	}

	private nextCurrentPlayer() {
		this._state.players.unshift(this._state.players.pop());
	}

	start(ownerKey: string) {
		if (this.isRunning) return;
		if (ownerKey !== this._ownerKey) return;
		if (!this.playersConditionToStart) return;
		
		let players: Player[] = [];
		const playersAmongMembers = this.playersAmongMembers;
		for (let i = 0; i < playersAmongMembers.length; i++) {
			players.push(new Player(playersAmongMembers[i].user, i+1));
		}
		players = players.sort(() => 0.5 - Math.random());

		const fieldCards = Array<FieldCard>(this._options.columns * this._options.rows);
		for (let i = 0; i < fieldCards.length; i++) {
			fieldCards[i] = {
				id: i+1,
				title: `Card ${i+1}`,
				captured: false,
				color: Field.COLOR_EMPTY
			};
		}
		const field = new Field(fieldCards, { columns: this._options.columns, rows: this._options.rows });
		this._state = {
			players,
			field
		};
		//
		this._status = Status.IS_RUNNING;
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		//
		this.channel.emit(SpyWSEvents.GET_ACT_FLAG, false);
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_FLAG, true);
		this.channel.emit(SpyWSEvents.GET_FIELD_CARDS, this._state.field.cards);
		this.channel.emit(SpyWSEvents.GET_SIZES, this._state.field.sizes);
		this.channel.emit(SpyWSEvents.GET_PLAYERS, this.playersPayload);
		this.channel.emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause);
		this.channel.emit(SpyWSEvents.GET_TIMER, this._flow.timer);
		this.channel.emit(SpyWSEvents.GET_RUNNING_FLAG, this.isRunning);
	}

	stop(ownerKey: string) {
		if (!this.isRunning) return;
		if (ownerKey !== this._ownerKey) return;
		//
		this._status = Status.IDLE;
		this._flow.stop();
		//
		this.channel.emit(SpyWSEvents.GET_RUNNING_FLAG, this.isRunning);
		this.channel.emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause);
		this.channel.emit(SpyWSEvents.GET_ACT_FLAG, false);
	}

	pause(ownerKey: string) {
		if (!this.isRunning || this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;
		this._flow.pause();

		this._status = Status.ON_PAUSE;

		this.channel.emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause);
	}

	resume(ownerKey: string) {
		if (!this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;
		this._flow.resume();

		this._status = Status.IS_RUNNING;

		this.channel.emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause);
	}

	broadcastNewNickname(): void {
		this.channel.emit(SpyWSEvents.GET_ALL_MEMBERS, this.membersPayload);
	}

	join(user: User): boolean {
    	this._logger.log(`User ${user.id} joining`);
    	if (this._members.some(member => member.user.nickname === user.nickname)) {
    		user.nickname += Room.ADDITIONAL_NICKNAME_CHAR;
    		this._server.to(user.id).emit(SpyWSEvents.GET_NICKNAME, { nickname: user.nickname, force: true });
		}
    	const member: Member = {
			user,
			isPlayer: false
		};
    	this._members.push(member);
    	if (!this._owner) {
    	    this._owner = member;
    	    this._ownerKey = uuidv4();
    	    this._server.to(user.id).emit(SpyWSEvents.GET_OWNER_KEY, this._ownerKey);
    	    this._server.to(user.id).emit(SpyWSEvents.GET_START_CONDITION_FLAG, this.playersConditionToStart);
    	}
    	user.socket.join(this._id);
    	if (this.isRunning) {
			this._server.to(user.id).emit(SpyWSEvents.GET_RUNNING_FLAG, this.isRunning);
			this._server.to(user.id).emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause);
			this._server.to(user.id).emit(SpyWSEvents.GET_FIELD_CARDS, this._state.field.cards);
			this._server.to(user.id).emit(SpyWSEvents.GET_SIZES, this._state.field.sizes);
			this._server.to(user.id).emit(SpyWSEvents.GET_PLAYERS, this.playersPayload);
			this._server.to(user.id).emit(SpyWSEvents.GET_TIMER, this._flow.timer);

			const player = this.checkRejoin(user);
			if (player) {
				member.isPlayer = true;
				player.user = user;
				this._server.to(user.id).emit(SpyWSEvents.GET_ACT_FLAG, this.currentPlayer === player);
			}
		}
    	this.channel.emit(SpyWSEvents.GET_ALL_MEMBERS, this.membersPayload);
    	this._logger.log(`User ${user.id} joined as spectator`);
    	return true;
	}

	private checkRejoin(user: User): Player | undefined {
		if (this.playersAmongMembers.length >= this._state.players.length) return;
		for (const player of this._state.players) {
			if (user.nickname === player.nickname) return player;
		}
	}

	moveCards(movement: MovementDto, user: User) {
		if (!this.isRunning || this.isOnPause) return;
		if (!user) return;
		if (user.id !== this.currentPlayer.user.id) return;
		this._state.field.move(movement);
		this.channel.emit(SpyWSEvents.GET_FIELD_CARDS, this._state.field.cards);
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_FLAG, false);
		this.nextCurrentPlayer();
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_FLAG, true);
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		this.channel.emit(SpyWSEvents.GET_TIMER, this._flow.timer);
	}

	kick(leavingUser: User) {
    	this._logger.log(`User ${leavingUser?.id} leaving`);
    	if (!leavingUser) return;
    	this._members = this._members.filter(member => member.user.id !== leavingUser.id);
    	if (this._members.length === 0) {
    	    this._owner = null;
    	    this._ownerKey = null;
    	} else if (leavingUser.id === this._owner.user.id) {
    		const newOwner = randomElement(this._members);
			this._owner = newOwner;
			this._ownerKey = uuidv4();
			this._server.to(newOwner.user.id).emit(SpyWSEvents.GET_OWNER_KEY, this._ownerKey);
			this._server.to(newOwner.user.id).emit(SpyWSEvents.GET_START_CONDITION_FLAG, this.playersConditionToStart);
		}
    	leavingUser.socket.leave(this._id);
    	this.channel.emit(SpyWSEvents.GET_ALL_MEMBERS, this.membersPayload);
    	this._logger.log(`User ${leavingUser.id} left`);
	}

	become(user: User, becomePlayer: boolean): boolean {
    	this._logger.log(`User ${user?.id} becoming ${becomePlayer ? 'player' : 'spectator'}`);
    	if (this.isRunning) return false;
    	if (!user) return false;
    	const member = this._members.find(member => member.user.id === user.id);
    	if (!member) return false;
    	member.isPlayer = becomePlayer;
    	this._logger.log(`User ${user?.id} became ${becomePlayer ? 'player' : 'spectator'}`);
    	this.channel.emit(SpyWSEvents.GET_ALL_MEMBERS, this.membersPayload);
		this._server.to(this._owner.user.id).emit(SpyWSEvents.GET_START_CONDITION_FLAG, this.playersConditionToStart);
		return true;
	}

	requestTimer(user: User) {
		if (!this.isRunning || !user) return;
		this._server.to(user.id).emit(SpyWSEvents.GET_TIMER, this._flow.timer);
	}
}
