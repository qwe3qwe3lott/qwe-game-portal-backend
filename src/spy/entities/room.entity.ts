import {User} from '../types/user.type';
import {v4 as uuidv4} from 'uuid';
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
    private get conditionToStart() {
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

	constructor(server: Server, roomOptions: RoomOptions) {
    	this._id = uuidv4();
    	this._owner = null;
    	this._ownerKey = uuidv4();
    	this._server = server;
    	this._members = [];
    	this._logger = new Logger(`Room ${this._id}`);
    	this.applyOptions(roomOptions);
    	this._status = Status.IDLE;
    	this._flow = new Flow();
    	this._timeoutAction = () => {
    		const movement = this.generateRandomMovement();
			this._state.field.move(movement);
			this.createAndApplyMovementLogRecord(movement, this.currentPlayer.nickname, true);
			this.letNextPlayerToActAndLaunchTimer();
		};
	}

	private static MIN_MIN_PLAYERS = 2;
	private static MAX_MIN_PLAYERS = 8;
	private static MIN_MAX_PLAYERS = 2;
	private static MAX_MAX_PLAYERS = 8;
	private static MIN_ROWS = 3;
	private static MAX_ROWS = 7;
	private static MIN_COLUMNS = 3;
	private static MAX_COLUMNS = 7;
	private static MIN_SECONDS_TO_ACT = 15;
	private static MAX_SECONDS_TO_ACT = 180;
	private static MIN_WIN_SCORE = 1;
	private static MAX_WIN_SCORE = 5;
	private applyOptions(options: RoomOptions): void {
		this._options = {
			minPlayers: (options.minPlayers && options.minPlayers < Room.MAX_MIN_PLAYERS && options.minPlayers > Room.MIN_MIN_PLAYERS) ? options.minPlayers : 2,
			maxPlayers: (options.maxPlayers && options.maxPlayers < Room.MAX_MAX_PLAYERS && options.maxPlayers > Room.MIN_MAX_PLAYERS) ? options.maxPlayers : 2,
			rows: (options.rows && options.rows < Room.MAX_ROWS && options.rows > Room.MIN_ROWS) ? options.rows : 5,
			columns: (options.columns && options.columns < Room.MAX_COLUMNS && options.columns > Room.MIN_COLUMNS) ? options.columns : 5,
			secondsToAct: (options.secondsToAct && options.secondsToAct < Room.MAX_SECONDS_TO_ACT && options.secondsToAct > Room.MIN_SECONDS_TO_ACT) ? options.secondsToAct : 60,
			winScore: (options.winScore && options.winScore < Room.MAX_WIN_SCORE && options.winScore > Room.MIN_WIN_SCORE) ? options.winScore : 3,
			optionsOfCards: options.optionsOfCards ?? [
				{ title: 'Radioactive', url: 'http://localhost:3003/cardPacks/HarryDuBois/Radioactive.jpg' },
				{ title: 'Love', url: 'http://localhost:3003/cardPacks/HarryDuBois/Love.jpg' },
				{ title: 'Ghibli', url: 'http://localhost:3003/cardPacks/HarryDuBois/Ghibli.jpg' },
				{ title: 'Death', url: 'http://localhost:3003/cardPacks/HarryDuBois/Death.jpg' },
				{ title: 'Surreal', url: 'http://localhost:3003/cardPacks/HarryDuBois/Surreal.jpg' },
				{ title: 'Robots', url: 'http://localhost:3003/cardPacks/HarryDuBois/Robots.jpg' },
				{ title: 'No Style', url: 'http://localhost:3003/cardPacks/HarryDuBois/NoStyle.jpg' },
				{ title: 'Wuhtercuhler', url: 'http://localhost:3003/cardPacks/HarryDuBois/Wuhtercuhler.jpg' },
				{ title: 'Provenance', url: 'http://localhost:3003/cardPacks/HarryDuBois/Provenance.jpg' },
				{ title: 'Moonwalker', url: 'http://localhost:3003/cardPacks/HarryDuBois/Moonwalker.jpg' },
				{ title: 'Blacklight', url: 'http://localhost:3003/cardPacks/HarryDuBois/Blacklight.jpg' },
				{ title: 'Rose Gold', url: 'http://localhost:3003/cardPacks/HarryDuBois/RoseGold.jpg' },
				{ title: 'Steampunk', url: 'http://localhost:3003/cardPacks/HarryDuBois/Steampunk.jpg' },
				{ title: 'Fantasy Art', url: 'http://localhost:3003/cardPacks/HarryDuBois/FantasyArt.jpg' },
				{ title: 'Vibrant', url: 'http://localhost:3003/cardPacks/HarryDuBois/Vibrant.jpg' },
				{ title: 'HD', url: 'http://localhost:3003/cardPacks/HarryDuBois/HD.jpg' },
				{ title: 'Psychic', url: 'http://localhost:3003/cardPacks/HarryDuBois/Psychic.jpg' },
				{ title: 'Dark Fantasy', url: 'http://localhost:3003/cardPacks/HarryDuBois/DarkFantasy.jpg' },
				{ title: 'Mystical', url: 'http://localhost:3003/cardPacks/HarryDuBois/Mystical.jpg' },
				{ title: 'Baroque', url: 'http://localhost:3003/cardPacks/HarryDuBois/Baroque.jpg' },
				{ title: 'Etching', url: 'http://localhost:3003/cardPacks/HarryDuBois/Etching.jpg' },
				{ title: 'S.Dali', url: 'http://localhost:3003/cardPacks/HarryDuBois/S.Dali.jpg' },
				{ title: 'Psychedelic', url: 'http://localhost:3003/cardPacks/HarryDuBois/Psychedelic.jpg' },
				{ title: 'Synthwave', url: 'http://localhost:3003/cardPacks/HarryDuBois/Synthwave.jpg' },
				{ title: 'Ukiyoe', url: 'http://localhost:3003/cardPacks/HarryDuBois/Ukiyoe.jpg' }
			]
		};
		if (this._options.minPlayers > this._options.maxPlayers) this._options.minPlayers = this._options.maxPlayers;
		// TODO: Больше проверок
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
		// Проверка возможности старта игры
		if (this.isRunning) return;
		if (ownerKey !== this._ownerKey) return;
		if (!this.conditionToStart) return;

		if (this._options.columns * this._options.rows > this._options.optionsOfCards.length) return;
		const randomSortedOptionsOfCards = [...this._options.optionsOfCards].sort(() => 0.5 - Math.random());

		const fieldCards = Array<FieldCard>(this._options.columns * this._options.rows);
		for (let i = 0; i < fieldCards.length; i++) {
			fieldCards[i] = {
				id: i+1,
				title: randomSortedOptionsOfCards[i].title,
				url: randomSortedOptionsOfCards[i].url,
				captured: false
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
			logs: [],
			winner: ''
		};
		//
		this._status = Status.IS_RUNNING;
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		//
		this.sendActFlagToAll(false);
		this.sendActFlagToUser(this.currentPlayer.user.id, true);
		this.sendFieldCardsToAll();
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_CARD_IDS, this._state.field.getActCardIds(this.currentPlayer.card));
		this.sendSizesToAll();
		this.sendPlayersToAll();
		this.sendTimerToAll();
		this.sendRunningFlagToAll();
	}

	stop(ownerKey: string): void {
		if (!this.isRunning) return;
		if (ownerKey !== this._ownerKey) return;
		//
		this._status = Status.IDLE;
		this._state.field.unmarkCards();
		this.sendFieldCardsToAll();
		this._flow.stop();
		//
		this.sendRunningFlagToAll();
	}

	pause(ownerKey: string): void {
		if (!this.isRunning || this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;
		this._flow.pause();

		this._status = Status.ON_PAUSE;

		this.sendPauseFlagToAll();
	}

	resume(ownerKey: string): void {
		if (!this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;
		this._flow.resume();

		this._status = Status.IS_RUNNING;

		this.sendPauseFlagToAll();
	}

	changeNickname(user: User, nickname: string): boolean {
		if (this.isRunning) return false;
		user.nickname = nickname;
		this.channel.emit(SpyWSEvents.GET_MEMBERS, this.membersPayload);
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
			this.sendOwnerKeyToUser(this._owner.user.id);
			this.sendStartConditionFlagToUser(this._owner.user.id);
    	}
    	user.socket.join(this._id);
    	// Наличие this._state говорит о том, что игра хоть раз запускалась
    	if (this._state) {
    		if (this._state.winner) this.sendLastWinnerToUser(user.id);
			this.sendFieldCardsToUser(user.id);
			this.sendSizesToUser(user.id);
			this.sendPlayersToUser(user.id);
			this.sendLogsToUser(user.id);
			if (this.isRunning) {
				this.sendRunningFlagToUser(user.id);
				this.sendPauseFlagToUser(user.id);
				this.sendTimerToUser(user.id);
				const player = this.checkRejoin(user);
				if (player) {
					member.isPlayer = true;
					player.user = user;
					if (this.currentPlayer === player) {
						this.sendActFlagToUser(user.id, true);
						this._server.to(user.id).emit(SpyWSEvents.GET_ACT_CARD_IDS, this._state.field.getActCardIds(this.currentPlayer.card));
						this._server.to(user.id).emit(SpyWSEvents.GET_CARD, player.card);
					}
				}
			}
		}
    	this.channel.emit(SpyWSEvents.GET_MEMBERS, this.membersPayload);
    	this._logger.log(`User ${user.id} joined as spectator`);
    	return true;
	}

	setOptions(options: RoomOptions, ownerKey: string): boolean {
		if (this.isRunning) return false;
		if (this._ownerKey !== ownerKey) return false;
		this.applyOptions(options);
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
		this.sendActFlagToUser(this.currentPlayer.user.id, false);
		this.nextCurrentPlayer();
		this.sendActFlagToUser(this.currentPlayer.user.id, true);
		this.sendFieldCardsToAll();
		this._server.to(this.currentPlayer.user.id).emit(SpyWSEvents.GET_ACT_CARD_IDS, this._state.field.getActCardIds(this.currentPlayer.card));
		this.sendPlayersToAll();
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		this.sendTimerToAll();
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
		this.sendRunningFlagToAll();
		this._state.winner = this.currentPlayer.nickname;
		this.sendLastWinnerToAll();
		this._state.field.unmarkCards();
		this.sendFieldCardsToAll();
	}

	captureCard(cardId: number, user: User): void {
		if (!this.isRunning || this.isOnPause) return;
		if (!user) return;
		if (user.id !== this.currentPlayer.user.id) return;
		const card = this._state.field.cards.find(card => card.id === cardId);
		if (!card || card.captured) return;
		if (!this._state.field.checkOpportunity(this.currentPlayer.card, card)) return;
		const capturedPlayer = this._state.players.find(player => player.card === card);
		const captured = capturedPlayer ? capturedPlayer.user !== user : false;
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
			this._owner = randomElement(this._members);
			this._ownerKey = uuidv4();
			this.sendOwnerKeyToUser(this._owner.user.id);
			this.sendStartConditionFlagToUser(this._owner.user.id);
    	}
    	leavingUser.socket.leave(this._id);
    	this.channel.emit(SpyWSEvents.GET_MEMBERS, this.membersPayload);
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
    	this.channel.emit(SpyWSEvents.GET_MEMBERS, this.membersPayload);
		this.sendStartConditionFlagToUser(this._owner.user.id);
		return true;
	}

	requestTimer(user: User) {
		if (!this.isRunning || !user) return;
		this.sendTimerToUser(user.id);
	}

	private sendLogsToAll() { this.channel.emit(SpyWSEvents.GET_ALL_LOG_RECORDS, this._state.logs); }
	private sendLogsToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_ALL_LOG_RECORDS, this._state.logs); }

	private sendLastWinnerToAll() { this.channel.emit(SpyWSEvents.GET_LAST_WINNER, this._state.winner); }
	private sendLastWinnerToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_LAST_WINNER, this._state.winner); }

	private sendFieldCardsToAll() { this.channel.emit(SpyWSEvents.GET_FIELD_CARDS, this._state.field.cards); }
	private sendFieldCardsToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_FIELD_CARDS, this._state.field.cards); }

	private sendSizesToAll() { this.channel.emit(SpyWSEvents.GET_SIZES, this._state.field.sizes); }
	private sendSizesToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_SIZES, this._state.field.sizes); }

	private sendPlayersToAll() { this.channel.emit(SpyWSEvents.GET_PLAYERS, this.playersPayload); }
	private sendPlayersToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_PLAYERS, this.playersPayload); }

	private sendTimerToAll() { this.channel.emit(SpyWSEvents.GET_TIMER, this._flow.timer); }
	private sendTimerToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_TIMER, this._flow.timer); }

	private sendRunningFlagToAll() { this.channel.emit(SpyWSEvents.GET_RUNNING_FLAG, this.isRunning); }
	private sendRunningFlagToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_RUNNING_FLAG, this.isRunning); }

	private sendPauseFlagToAll() { this.channel.emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause); }
	private sendPauseFlagToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_PAUSE_FLAG, this.isOnPause); }

	private sendActFlagToAll(flag: boolean) { this.channel.emit(SpyWSEvents.GET_ACT_FLAG, flag); }
	private sendActFlagToUser(userId: string, flag: boolean) { this._server.to(userId).emit(SpyWSEvents.GET_ACT_FLAG, flag); }

	private sendStartConditionFlagToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_START_CONDITION_FLAG, this.conditionToStart); }

	private sendOwnerKeyToUser(userId: string) { this._server.to(userId).emit(SpyWSEvents.GET_OWNER_KEY, this._ownerKey); }
}
