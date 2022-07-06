import {User} from '../../types/user.type';
import {v4 as uuidv4} from 'uuid';
import {Server} from 'socket.io';
import {Events} from '../enums/events.enum';
import {Member} from '../../types/member.type';
import {RoomOptions} from '../types/room-options.type';
import {State} from '../types/state.type';
import {Player} from './player.entity';
import {FieldCard} from '../types/field-card.type';
import {Field} from './field.entity';
import {randomElement} from '../../util/random-element.util';
import {MovementDto} from '../dto/movement.dto';
import {LogRecord} from '../../types/log-record.type';
import {CardOptions} from '../types/card-options.type';
import {GameRoom} from '../../abstracts/game-room.abstract';
import {RoomStatus} from '../types/room-status.type';

export class Room extends GameRoom<Player, State, RoomStatus, RoomOptions> {
	protected get restrictionsToStart(): string[] {
    	const restrictions: string[] = [];
    	const playersAmongMembersCount = this.playersAmongMembers.length;
    	if (playersAmongMembersCount < this._options.minPlayers) restrictions.push('Недостаточно игроков');
    	if (playersAmongMembersCount > this._options.maxPlayers) restrictions.push('Слишком много игроков');
    	const cardsInField = Math.min(this._optionsOfCards.length, this._options.rows * this._options.columns);
    	const cardsToPlay = this._options.winScore * this.playersAmongMembers.length;
    	if (cardsToPlay > cardsInField) restrictions.push(`Карт в колоде (${this._optionsOfCards.length}) или размера поля (${this._options.columns}x${this._options.rows}) 
    	не хватит для текущего количества игроков (${this.playersAmongMembers.length}) и цели (${this._options.winScore}). Количество карт, которые нужно разложить 
    	на поле: ${cardsToPlay}`);
    	return restrictions;
	}
	private _optionsOfCards: CardOptions[]
	protected get playersPayload() { return this._state.players.map(player => ({ id: player.id, nickname: player.nickname, score: player.score })); }
	private readonly _timeoutAction: () => void
	private get cardsOfPlayers() { return this._state.players.map(player => player.card); }

	public constructor(server: Server) {
		super(server);
    	this.applyOptionsOfCards(Room.getDefaultOptionsOfCards());
    	this._timeoutAction = () => {
    		const movement = Room.generateRandomMovement(this._options.rows, this._options.columns);
			this._state.field.move(movement);
			this.createAndApplyMovementLogRecord(movement, this.currentPlayer.nickname, true);
			this.letNextPlayerToActAndLaunchTimer();
		};
	}

	delete(): void {
		// TODO: очистить комнату
		if (this.isRunning) {
			this._status = 'idle';
			this._flow.stop();
		}
	}

	private static readonly MIN_MIN_PLAYERS = 2;
	private static readonly MAX_MIN_PLAYERS = 8;
	private static readonly MIN_MAX_PLAYERS = 2;
	private static readonly MAX_MAX_PLAYERS = 8;
	private static readonly MIN_ROWS = 3;
	private static readonly MAX_ROWS = 7;
	private static readonly MIN_COLUMNS = 3;
	private static readonly MAX_COLUMNS = 7;
	private static readonly MIN_SECONDS_TO_ACT = 15;
	private static readonly MAX_SECONDS_TO_ACT = 180;
	private static readonly MIN_WIN_SCORE = 1;
	private static readonly MAX_WIN_SCORE = 5;
	private static getDefaultOptionsOfCards = (): CardOptions[] => ([
		{ id: 1, title: 'Radioactive', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Radioactive.jpg' },
		{ id: 2, title: 'Love', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Love.jpg' },
		{ id: 3, title: 'Ghibli', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Ghibli.jpg' },
		{ id: 4, title: 'Death', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Death.jpg' },
		{ id: 5, title: 'Surreal', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Surreal.jpg' },
		{ id: 6, title: 'Robots', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Robots.jpg' },
		{ id: 7, title: 'No Style', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/NoStyle.jpg' },
		{ id: 8, title: 'Wuhtercuhler', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Wuhtercuhler.jpg' },
		{ id: 9, title: 'Provenance', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Provenance.jpg' },
		{ id: 10, title: 'Moonwalker', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Moonwalker.jpg' },
		{ id: 11, title: 'Blacklight', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Blacklight.jpg' },
		{ id: 12, title: 'Rose Gold', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/RoseGold.jpg' },
		{ id: 13, title: 'Steampunk', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Steampunk.jpg' },
		{ id: 14, title: 'Fantasy Art', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/FantasyArt.jpg' },
		{ id: 15, title: 'Vibrant', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Vibrant.jpg' },
		{ id: 16, title: 'HD', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/HD.jpg' },
		{ id: 17, title: 'Psychic', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Psychic.jpg' },
		{ id: 18, title: 'Dark Fantasy', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/DarkFantasy.jpg' },
		{ id: 19, title: 'Mystical', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Mystical.jpg' },
		{ id: 20, title: 'Baroque', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Baroque.jpg' },
		{ id: 21, title: 'Etching', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Etching.jpg' },
		{ id: 22, title: 'S.Dali', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/S.Dali.jpg' },
		{ id: 23, title: 'Psychedelic', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Psychedelic.jpg' },
		{ id: 24, title: 'Synthwave', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Synthwave.jpg' },
		{ id: 25, title: 'Ukiyoe', url: 'https://kozlov-spy-api.tk/cardPacks/HarryDuBois/Ukiyoe.jpg' }
	])
	protected getDefaultOptions() { return { minPlayers: 2, maxPlayers: 8, rows: 5, columns: 5, secondsToAct: 60, winScore: 3 }; }
	protected applyOptions(options: RoomOptions): void {
		this._options = {
			minPlayers: (options.minPlayers && options.minPlayers <= Room.MAX_MIN_PLAYERS && options.minPlayers >= Room.MIN_MIN_PLAYERS) ? options.minPlayers : 2,
			maxPlayers: (options.maxPlayers && options.maxPlayers <= Room.MAX_MAX_PLAYERS && options.maxPlayers >= Room.MIN_MAX_PLAYERS) ? options.maxPlayers : 8,
			rows: (options.rows && options.rows <= Room.MAX_ROWS && options.rows >= Room.MIN_ROWS) ? options.rows : 5,
			columns: (options.columns && options.columns <= Room.MAX_COLUMNS && options.columns >= Room.MIN_COLUMNS) ? options.columns : 5,
			secondsToAct: (options.secondsToAct && options.secondsToAct <= Room.MAX_SECONDS_TO_ACT && options.secondsToAct >= Room.MIN_SECONDS_TO_ACT) ? options.secondsToAct : 60,
			winScore: (options.winScore && options.winScore <= Room.MAX_WIN_SCORE && options.winScore >= Room.MIN_WIN_SCORE) ? options.winScore : 3
		};
		if (this._options.minPlayers > this._options.maxPlayers) this._options.minPlayers = this._options.maxPlayers;
		// TODO: Больше проверок, лучше проверять карты
	}
	private applyOptionsOfCards(optionsOfCards: CardOptions[]): void {
		for (let i = 0; i < optionsOfCards.length; i++) {
			optionsOfCards[i].id = i+1;
		}
		this._optionsOfCards = optionsOfCards;
		// TODO: Больше проверок, лучше проверять карты
	}

	private static generateRandomMovement(rows: number, columns: number): MovementDto {
		const isRow = Math.random() < 0.5;
		return {
			isRow,
			forward: Math.random() < 0.5,
			id: Math.floor(Math.random() * (isRow ? rows : columns)) + 1
		};
	}

	public start(ownerKey: string): void {
		// Проверка возможности старта игры
		if (this.isRunning) return;
		if (ownerKey !== this._ownerKey) return;
		if (this.restrictionsToStart.length > 0) return;
		// Если кард будет нехватать для покрытия игрового поля, то будут использоваться заранее пойманные карты для заполнения пробелов
		// Если кард будет больше чем можно выложить, будут выбраны случайные из доступных карт
		const totalCards = this._options.columns * this._options.rows;
		const optionsOfCards = totalCards < this._optionsOfCards.length ? [...this._optionsOfCards].sort(() => 0.5 - Math.random()) : this._optionsOfCards;
		const fieldCards: FieldCard[] = [];
		const totalCardsToAdd = Math.min(totalCards, optionsOfCards.length);
		for (let i = 0; i < totalCardsToAdd; i++) {
			fieldCards.push({
				id: i+1,
				title: optionsOfCards[i].title,
				url: optionsOfCards[i].url,
				captured: false
			});
		}
		// Дозаполняем поле заранее пойманными картами, если необходимо
		while (fieldCards.length < totalCards) {
			fieldCards.push({
				id: fieldCards.length+1,
				title: '',
				url: '',
				captured: true
			});
		}
		fieldCards.sort(() => 0.5 - Math.random());
		// Формируем очередь из игроков в случайном порядке и случайно формируем порядок карт для выдачи игрокам
		let players: Player[] = [];
		const playersAmongMembers = this.playersAmongMembers;
		const cardsForPlayers = [...fieldCards.filter(card => !card.captured)].sort(() => 0.5 - Math.random());
		for (let i = 0; i < playersAmongMembers.length; i++) {
			players.push(new Player(playersAmongMembers[i].user, i+1, cardsForPlayers[i]));
			this.sendCardToUser(playersAmongMembers[i].user.id, cardsForPlayers[i]);
		}
		players = players.sort(() => 0.5 - Math.random());
		// Создаём игровое поле
		const field = new Field(fieldCards,
			{ columns: this._options.columns, rows: this._options.rows },
			cardsForPlayers.slice(playersAmongMembers.length, cardsForPlayers.length));
		// Создаём новое состояние для матча
		this._state = {
			players,
			field,
			logs: [],
			winner: ''
		};
		// Запускаем поток событий
		this._status = 'run';
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		// Отправляем данные пользователям
		this.sendActFlagToAll(false);
		this.sendActFlagToUser(this.currentPlayer.user.id, true);
		this.sendFieldCardsToAll();
		this.sendActCardIdsToUser(this.currentPlayer.user.id, this._state.field.getActCardIds(this.currentPlayer.card));
		this.sendSizesToAll();
		this.sendPlayersToAll();
		this.sendLogsToAll();
		this.sendTimerToAll();
		this.sendRoomStatusToAll();
	}

	public stop(ownerKey: string): void {
		if (!this.isRunning) return;
		if (ownerKey !== this._ownerKey) return;
		//
		this._status = 'idle';
		this._state.field.unmarkCards();
		this.sendFieldCardsToAll();
		this._flow.stop();
		//
		this.sendRoomStatusToAll();
	}

	public pause(ownerKey: string): void {
		if (!this.isRunning || this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;
		this._flow.pause();

		this._status = 'pause';

		this.sendRoomStatusToAll();
	}

	public resume(ownerKey: string): void {
		if (!this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;
		this._flow.resume();

		this._status = 'run';

		this.sendRoomStatusToAll();
	}

	public join(user: User): boolean {
    	this._logger.log(`User ${user.id} joining`);
    	// Переименновываем пользователя при входе, если пользователь с таким ником уже есть в комнате
    	const renamed = false;
    	while (this._members.some(member => member.user.nickname === user.nickname)) {
    		user.nickname += Room.ADDITIONAL_NICKNAME_CHAR;
		}
		if (renamed) this.sendNicknameToUser(user.id, user.nickname, true);
		// Добавляем пользователя с список пользователей в комнате
		const member: Member = { user, isPlayer: false };
    	this._members.push(member);
    	// Если при входе в комнату в ней ниткого не было, то пользователь становится владельцем комнаты
    	if (!this._owner) {
    	    this._owner = member;
    	    this._ownerKey = uuidv4();
			this.sendOwnerKeyToUser(this._owner.user.id);
			this.sendRestrictionsToStartToUser(this._owner.user.id);
    	}
    	// Подключаем пользователя к каналу комнаты
    	user.socket.join(this._id);
    	// Далее отправляем пользователю данные из комнаты
    	this.sendOptionsToUser(user.id);
    	this.sendOptionsOfCardsToUser(user.id);
    	// Наличие this._state говорит о том, что игра хоть раз запускалась
    	if (this._state) {
    		if (this._state.winner) this.sendLastWinnerToUser(user.id);
			this.sendFieldCardsToUser(user.id);
			this.sendSizesToUser(user.id);
			this.sendPlayersToUser(user.id);
			// Если матч в комнате сейчас идёт
			if (this.isRunning) {
				this.sendRoomStatusToUser(user.id);
				this.sendTimerToUser(user.id);
				// Проверяем, если пользователь переподключился к комнате
				const player = this.checkRejoin(user);
				if (player) {
					member.isPlayer = true;
					player.user = user;
					// Проверяем, если пользователь сейчас ходит
					if (this.currentPlayer === player) {
						this.sendActFlagToUser(user.id, true);
						this.sendActCardIdsToUser(user.id, this._state.field.getActCardIds(this.currentPlayer.card));
					}
					this.sendCardToUser(user.id, player.card);
				}
			}
			this.sendLogsToUser(user.id);
		}
    	this.sendMembersToAll();
		this.sendRestrictionsToStartToUser(this._owner.user.id);
    	this._logger.log(`User ${user.id} joined as spectator`);
    	return true;
	}

	public setOptionsOfCards(optionsOfCards: CardOptions[], ownerKey: string): boolean {
		if (this.isRunning) return false;
		if (this._ownerKey !== ownerKey) return false;
		this.applyOptionsOfCards(optionsOfCards);
		this.sendOptionsOfCardsToAll();
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
			text: `${isTimeout ? '(Тайм аут) ' : ''} "${nickname}" передвинул ${movement.id} ${movement.isRow ? 'строку' : 'столбец'} 
			${movement.isRow ? (movement.forward ? 'вправо' : 'влево') : (movement.forward ? 'вниз' : 'вверх')}`
		};
		this._state.logs.unshift(logRecord);
		this.sendLogRecordToAll(logRecord);
		return logRecord;
	}

	private createAndApplyCaptureLogRecord(card: FieldCard, nickname: string, capturedNickname?: string): LogRecord {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: capturedNickname ? `"${capturedNickname}", будучи "${card.title}", был пойман игроком ${nickname}`
				: `"${nickname}" никого не поймал, указав на "${card.title}"`
		};
		this._state.logs.unshift(logRecord);
		this.sendLogRecordToAll(logRecord);
		return logRecord;
	}

	private createAndApplyAskLogRecord(card: FieldCard, nickname: string, spiesCount: number): LogRecord {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: `"${nickname}" допросил "${card.title}" и ${spiesCount === 0 ? 'никого не нашёл' : `обнаружил шпионов (${spiesCount})`}`
		};
		this._state.logs.unshift(logRecord);
		this.sendLogRecordToAll(logRecord);
		return logRecord;
	}

	private letNextPlayerToActAndLaunchTimer(): void {
		this.sendActFlagToUser(this.currentPlayer.user.id, false);
		this.nextCurrentPlayer();
		this.sendActFlagToUser(this.currentPlayer.user.id, true);
		this.sendFieldCardsToAll();
		this.sendActCardIdsToUser(this.currentPlayer.user.id, this._state.field.getActCardIds(this.currentPlayer.card));
		this.sendPlayersToAll();
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		this.sendTimerToAll();
	}

	public moveCards(movement: MovementDto, user: User): void {
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
		this._status = 'idle';
		this._flow.stop();
		this.sendRoomStatusToAll();
		this._state.winner = this.currentPlayer.nickname;
		this.sendLastWinnerToAll();
		this._state.field.unmarkCards();
		this.sendFieldCardsToAll();
		this.sendRestrictionsToStartToUser(this._owner.user.id);
	}

	public captureCard(cardId: number, user: User): void {
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
				this.sendPlayersToAll();
				this.win();
				return;
			}
			capturedPlayer.card = newCard;
			this.sendCardToUser(capturedPlayer.user.id, newCard);
		}
		this.letNextPlayerToActAndLaunchTimer();
	}

	public askCard(cardId: number, user: User): void {
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

	public kick(leavingUser: User): void {
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
			this.sendRestrictionsToStartToUser(this._owner.user.id);
    	} else {
			this.sendRestrictionsToStartToUser(this._owner.user.id);
		}
    	leavingUser.socket.leave(this._id);
    	this.sendMembersToAll();
    	this._logger.log(`User ${leavingUser.id} left`);
	}

	public become(user: User, becomePlayer: boolean): boolean {
    	this._logger.log(`User ${user?.id} becoming ${becomePlayer ? 'player' : 'spectator'}`);
    	if (this.isRunning) return false;
    	if (!user) return false;
    	const member = this._members.find(member => member.user.id === user.id);
    	if (!member) return false;
    	member.isPlayer = becomePlayer;
    	this._logger.log(`User ${user?.id} became ${becomePlayer ? 'player' : 'spectator'}`);
    	this.sendMembersToAll();
		this.sendRestrictionsToStartToUser(this._owner.user.id);
		return true;
	}

	public requestOptionsOfCards(user: User): void {
		if (!user) return;
		this.sendOptionsOfCardsToUser(user.id);
	}

	private sendLastWinnerToAll() { this.channel.emit(Events.GET_LAST_WINNER, this._state.winner); }
	private sendLastWinnerToUser(userId: string) { this._server.to(userId).emit(Events.GET_LAST_WINNER, this._state.winner); }

	private sendFieldCardsToAll() { this.channel.emit(Events.GET_FIELD_CARDS, this._state.field.cards); }
	private sendFieldCardsToUser(userId: string) { this._server.to(userId).emit(Events.GET_FIELD_CARDS, this._state.field.cards); }

	private sendSizesToAll() { this.channel.emit(Events.GET_SIZES, this._state.field.sizes); }
	private sendSizesToUser(userId: string) { this._server.to(userId).emit(Events.GET_SIZES, this._state.field.sizes); }

	private sendOptionsOfCardsToAll() { this.channel.emit(Events.GET_ROOM_OPTIONS_OF_CARDS, this._optionsOfCards); }
	private sendOptionsOfCardsToUser(userId: string) { this._server.to(userId).emit(Events.GET_ROOM_OPTIONS_OF_CARDS, this._optionsOfCards); }

	private sendCardToUser(userId: string, card: FieldCard) { this._server.to(userId).emit(Events.GET_CARD, card); }

	private sendActCardIdsToUser(userId: string, actCardIds: number[]) { this._server.to(userId).emit(Events.GET_ACT_CARD_IDS, actCardIds); }
}
