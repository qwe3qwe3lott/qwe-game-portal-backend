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
import {LogRecord} from '../types/log-record.type';

enum Status {
	IDLE,
	IS_RUNNING,
	ON_PAUSE
}

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
			nickname: player.nickname,
			score: player.score
		}));
	}
	private _flow: Flow
	private readonly _timeoutAction: () => void
	private get cardsOfPlayers() { return this._state.players.map(player => player.card); }

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
			columns: 5,
			secondsToAct: 15,
			winScore: 3
		};
    	this._status = Status.IDLE;
    	this._flow = new Flow();
    	this._timeoutAction = () => {
    		const movement = this.generateRandomMovement();
			this._state.field.move(movement);
			this.createAndApplyMovementLogRecord(movement, this.currentPlayer.nickname, true);
			this.letNextPlayerToActAndLaunchTimer();
		};
	}

	private generateRandomMovement(): MovementDto {
		const isRow = Math.random() < 0.5;
		return {
			isRow,
			forward: Math.random() < 0.5,
			id: Math.floor(Math.random() * (isRow ? this._options.rows : this._options.columns)) + 1
		};
	}

	private nextCurrentPlayer() {
		this._state.players.unshift(this._state.players.pop());
	}

	start(ownerKey: string) {
		if (this.isRunning) return;
		if (ownerKey !== this._ownerKey) return;
		if (!this.playersConditionToStart) return;

		const fieldCards = Array<FieldCard>(this._options.columns * this._options.rows);
		for (let i = 0; i < fieldCards.length; i++) {
			fieldCards[i] = {
				id: i+1,
				title: `Card ${i+1}`,
				captured: false,
				color: Field.COLOR_EMPTY
			};
		}

		let players: Player[] = [];
		const playersAmongMembers = this.playersAmongMembers;
		const cardsForPlayers = [...fieldCards].sort(() => 0.5 - Math.random());
		for (let i = 0; i < playersAmongMembers.length; i++) {
			players.push(new Player(playersAmongMembers[i].user, i+1, cardsForPlayers[i]));
			this._server.to(playersAmongMembers[i].user.id).emit(SpyWSEvents.GET_CARD, cardsForPlayers[i]);
		}
		players = players.sort(() => 0.5 - Math.random());

		const field = new Field(fieldCards,
			{ columns: this._options.columns, rows: this._options.rows },
			cardsForPlayers.slice(playersAmongMembers.length, cardsForPlayers.length));

		this._state = {
			players,
			field,
			logs: []
		};
		//
		this._status = Status.IS_RUNNING;
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		//
		this.channel.emit(SpyWSEvents.GET_ACT_FLAG, false);
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_FLAG, true);
		this.channel.emit(SpyWSEvents.GET_FIELD_CARDS, this._state.field.cards);
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_CARD_IDS, this._state.field.getActCardIds(this.currentPlayer.card));
		this.channel.emit(SpyWSEvents.GET_SIZES, this._state.field.sizes);
		this.channel.emit(SpyWSEvents.GET_PLAYERS, this.playersPayload);
		this.channel.emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause);
		this.channel.emit(SpyWSEvents.GET_TIMER, this._flow.timer);
		this.channel.emit(SpyWSEvents.GET_RUNNING_FLAG, this.isRunning);
	}

	stop(ownerKey: string): void {
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

	pause(ownerKey: string): void {
		if (!this.isRunning || this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;
		this._flow.pause();

		this._status = Status.ON_PAUSE;

		this.channel.emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause);
	}

	resume(ownerKey: string): void {
		if (!this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;
		this._flow.resume();

		this._status = Status.IS_RUNNING;

		this.channel.emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause);
	}

	changeNickname(user: User, nickname: string): boolean {
		if (this.isRunning) return false;
		user.nickname = nickname;
		this.channel.emit(SpyWSEvents.GET_ALL_MEMBERS, this.membersPayload);
		return true;
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
			this._server.to(user.id).emit(SpyWSEvents.GET_ALL_LOG_RECORDS, this._state.logs);

			const player = this.checkRejoin(user);
			if (player) {
				member.isPlayer = true;
				player.user = user;
				if (this.currentPlayer === player) {
					this._server.to(user.id).emit(SpyWSEvents.GET_ACT_FLAG, true);
					this._server.to(user.id).emit(SpyWSEvents.GET_ACT_CARD_IDS, this._state.field.getActCardIds(this.currentPlayer.card));
				}
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

	private createAndApplyMovementLogRecord(movement: MovementDto, nickname: string, isTimeout?: boolean): LogRecord {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: `${isTimeout ? '(Тайм аут) ' : ''} Игрок "${nickname}" передвинул ${movement.id} ${movement.isRow ? 'строку' : 'столбец'} 
			${movement.isRow ? (movement.forward ? 'вправо' : 'влево') : (movement.forward ? 'вниз' : 'вверх')}`
		};
		this._state.logs.unshift(logRecord);
		this.channel.emit(SpyWSEvents.GET_LOG_RECORD, logRecord);
		return logRecord;
	}

	private createAndApplyCaptureLogRecord(card: FieldCard, nickname: string, capturedNickname?: string): LogRecord {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: capturedNickname ? `Игрок "${nickname}", будучи картой "${card.title}", был пойман игроком ${nickname}`
				: `Игрок "${nickname}" никого не поймал, указав на карту "${card.title}"`
		};
		this._state.logs.unshift(logRecord);
		this.channel.emit(SpyWSEvents.GET_LOG_RECORD, logRecord);
		return logRecord;
	}

	private createAndApplyAskLogRecord(card: FieldCard, nickname: string, spiesCount: number): LogRecord {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: `Игрок "${nickname}" допросил карту "${card.title}" и узнал, что вблизи этой карты кроме него ${spiesCount === 0 ? 'никого нет' : `есть шпионы ${spiesCount}`}`
		};
		this._state.logs.unshift(logRecord);
		this.channel.emit(SpyWSEvents.GET_LOG_RECORD, logRecord);
		return logRecord;
	}

	private letNextPlayerToActAndLaunchTimer(): void {
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_FLAG, false);
		this.nextCurrentPlayer();
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_FLAG, true);
		this.channel.emit(SpyWSEvents.GET_FIELD_CARDS, this._state.field.cards);
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_CARD_IDS, this._state.field.getActCardIds(this.currentPlayer.card));
		this.channel.emit(SpyWSEvents.GET_PLAYERS, this.playersPayload);
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		this.channel.emit(SpyWSEvents.GET_TIMER, this._flow.timer);
	}

	moveCards(movement: MovementDto, user: User): void {
		if (!this.isRunning || this.isOnPause) return;
		if (!user) return;
		if (user.id !== this.currentPlayer.user.id) return;
		this._state.field.move(movement);
		this.createAndApplyMovementLogRecord(movement, this.currentPlayer.nickname);
		this.letNextPlayerToActAndLaunchTimer();
	}

	private get winCondition(): boolean {
		return this.isRunning ? this._state.players.some(player => player.score >= this._options.winScore) : false;
	}

	private win(): void {
		this._status = Status.IDLE;
		this._flow.stop();
		this.channel.emit(SpyWSEvents.GET_RUNNING_FLAG, this.isRunning);
		this.channel.emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause);
		this.channel.emit(SpyWSEvents.GET_ACT_FLAG, false);
	}

	captureCard(cardId: number, user: User): void {
		if (!this.isRunning || this.isOnPause) return;
		if (!user) return;
		if (user.id !== this.currentPlayer.user.id) return;
		const card = this._state.field.cards.find(card => card.id === cardId);
		if (!card || card.captured) return;
		if (!this._state.field.checkOpportunity(this.currentPlayer.card, card)) return;
		const capturedPlayer = this._state.players.find(player => player.card === card);
		const captured = capturedPlayer && capturedPlayer.user !== user;
		const newCard = this._state.field.capture(card, captured);
		this.createAndApplyCaptureLogRecord(card, this.currentPlayer.nickname, captured ? capturedPlayer?.nickname : undefined);
		if (captured) {
			this.currentPlayer.score += 1;
			if (this.winCondition) {
				this.win();
				return;
			}
			capturedPlayer.card = newCard;
			this._server.to(capturedPlayer.user.id).emit(SpyWSEvents.GET_CARD, newCard);
		}
		this.letNextPlayerToActAndLaunchTimer();
	}

	askCard(cardId: number, user: User): void {
		if (!this.isRunning || this.isOnPause) return;
		if (!user) return;
		if (user.id !== this.currentPlayer.user.id) return;
		const card = this._state.field.cards.find(card => card.id === cardId);
		if (!card || card.captured) return;
		if (!this._state.field.checkOpportunity(this.currentPlayer.card, card)) return;
		const spiesCount = this._state.field.ask(card, this.cardsOfPlayers.filter(playerCard => playerCard !== this.currentPlayer.card));
		this.createAndApplyAskLogRecord(card, this.currentPlayer.nickname, spiesCount);
		this.letNextPlayerToActAndLaunchTimer();
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
