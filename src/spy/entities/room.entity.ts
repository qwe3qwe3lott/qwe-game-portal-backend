import {User} from '../../types/user.type';
import {Server} from 'socket.io';
import {Events} from '../enums/events.enum';
import {Member} from '../../types/member.type';
import {RoomOptions} from '../types/room-options.type';
import {State} from '../types/state.type';
import {Player} from './player.entity';
import {FieldCard} from '../types/field-card.type';
import {Field} from './field.entity';
import {MovementDto} from '../dto/movement.dto';
import {LogRecord} from '../../types/log-record.type';
import {CardOptions} from '../types/card-options.type';
import {GameRoom} from '../../abstracts/game-room.abstract';
import {RoomStatus} from '../types/room-status.type';
import {PlayersPayload} from '../types/players-payload.type';

export class Room extends GameRoom<Player, State, RoomStatus, RoomOptions, PlayersPayload> {
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
		this._state = {
			players: [],
			logs: [],
			winner: ''
		};
    	this.applyOptionsOfCards(Room.getDefaultOptionsOfCards());
    	this._timeoutAction = () => {
    		const movement = Room.generateRandomMovement(this._options.rows, this._options.columns);
			this._state.field?.move(movement);
			this.createAndApplyMovementLogRecord(movement, this.currentPlayer.nickname, true);
			this.letNextPlayerToActAndLaunchTimer();
		};
	}

	protected get isRunning() { return this._status === 'run'; }

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
		const players: Player[] = [];
		const playersAmongMembers = this.playersAmongMembers;
		const cardsForPlayers = [...fieldCards.filter(card => !card.captured)].sort(() => 0.5 - Math.random());
		for (let i = 0; i < playersAmongMembers.length; i++) {
			players.push(new Player(playersAmongMembers[i].user, i+1, cardsForPlayers[i]));
			this.sendCardToUser(playersAmongMembers[i].user.id, cardsForPlayers[i]);
		}
		this._state.players = players.sort(() => 0.5 - Math.random());
		this._state.field = new Field(fieldCards,
			{columns: this._options.columns, rows: this._options.rows},
			cardsForPlayers.slice(playersAmongMembers.length, cardsForPlayers.length));
		this._state.logs = [];
		this._state.winner = '';
		this._status = 'run';
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		this.sendActFlagToAll(false);
		this.sendActFlagToUser(this.currentPlayer.user.id, true);
		this.sendFieldCardsToAll();
		this.sendActCardIdsToUser(this.currentPlayer.user.id, this._state.field.getActCardIds(this.currentPlayer.card));
		this.sendSizesToAll();
		this.sendPlayersToAll();
		this.sendLogsToAll();
		this.sendTimerToAll();
		this.sendRoomStatusToAll();
		this.sendPauseFlagToAll();
	}

	public stop(ownerKey: string): void {
		if (!this.isRunning) return;
		if (ownerKey !== this._ownerKey) return;

		this._status = 'idle';
		this._state.field?.unmarkCards();
		this.sendFieldCardsToAll();
		this._flow.stop();
		this.sendRoomStatusToAll();
		this.sendPauseFlagToAll();
	}

	public pause(ownerKey: string): void {
		if (!this.isRunning || this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;

		this._flow.pause();
		this.sendRoomStatusToAll();
		this.sendPauseFlagToAll();
	}

	public resume(ownerKey: string): void {
		if (!this.isOnPause) return;
		if (ownerKey !== this._ownerKey) return;

		this._flow.resume();
		this.sendRoomStatusToAll();
		this.sendPauseFlagToAll();
	}

	protected onJoinSuccess(member: Member): void {
    	const user = member.user;
    	this.sendRoomTitleToUser(user.id);
    	this.sendOptionsToUser(user.id);
    	this.sendOptionsOfCardsToUser(user.id);
    	if (this._state.winner) this.sendLastWinnerToUser(user.id);
		if (this._state.field) {
			this.sendFieldCardsToUser(user.id);
			this.sendSizesToUser(user.id);
		}
		if (this._state.players.length > 0) this.sendPlayersToUser(user.id);
		if (this.isRunning) {
			this.sendRoomStatusToUser(user.id);
			this.sendPauseFlagToUser(user.id);
			this.sendTimerToUser(user.id);
			const player = this.checkRejoin(user);
			if (player) {
				member.isPlayer = true;
				player.user = user;
				if (this.currentPlayer === player) {
					this.sendActFlagToUser(user.id, true);
					this.sendActCardIdsToUser(user.id, this._state.field!.getActCardIds(this.currentPlayer.card));
				}
				this.sendCardToUser(user.id, player.card);
			}
		}
		this.sendLogsToUser(user.id);
	}

	public setOptionsOfCards(optionsOfCards: CardOptions[], ownerKey: string): boolean {
		if (this.isRunning) return false;
		if (this._ownerKey !== ownerKey) return false;
		this.applyOptionsOfCards(optionsOfCards);
		this.sendOptionsOfCardsToAll();
		return true;
	}

	private createAndApplyMovementLogRecord(movement: MovementDto, nickname: string, isTimeout?: boolean) {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: `${isTimeout ? '(Тайм аут) ' : ''} "${nickname}" передвинул ${movement.id} ${movement.isRow ? 'строку' : 'столбец'} 
			${movement.isRow ? (movement.forward ? 'вправо' : 'влево') : (movement.forward ? 'вниз' : 'вверх')}`
		};
		this._state.logs.unshift(logRecord);
		this.sendLogRecordToAll(logRecord);
	}

	private createAndApplyCaptureLogRecord(card: FieldCard, nickname: string, capturedNickname?: string) {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: capturedNickname ? `"${capturedNickname}", будучи "${card.title}", был пойман игроком ${nickname}`
				: `"${nickname}" никого не поймал, указав на "${card.title}"`
		};
		this._state.logs.unshift(logRecord);
		this.sendLogRecordToAll(logRecord);
	}

	private createAndApplyAskLogRecord(card: FieldCard, nickname: string, spiesCount: number) {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: `"${nickname}" допросил "${card.title}" и ${spiesCount === 0 ? 'никого не нашёл' : `обнаружил шпионов (${spiesCount})`}`
		};
		this._state.logs.unshift(logRecord);
		this.sendLogRecordToAll(logRecord);
	}

	private letNextPlayerToActAndLaunchTimer(): void {
		this.sendActFlagToUser(this.currentPlayer.user.id, false);
		this.nextCurrentPlayer();
		this.sendActFlagToUser(this.currentPlayer.user.id, true);
		this.sendFieldCardsToAll();
		this.sendActCardIdsToUser(this.currentPlayer.user.id, this._state.field!.getActCardIds(this.currentPlayer.card));
		this.sendPlayersToAll();
		this._flow.checkout(this._timeoutAction, this._options.secondsToAct);
		this.sendTimerToAll();
	}

	public moveCards(movement: MovementDto, user: User): void {
		if (!this.isRunning || this.isOnPause) return;
		if (!user) return;
		if (user.id !== this.currentPlayer.user.id) return;
		this._state.field!.move(movement);
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
		this.sendPauseFlagToAll();
		this._state.winner = this.currentPlayer.nickname;
		this.sendLastWinnerToAll();
		this._state.field!.unmarkCards();
		this.sendFieldCardsToAll();
		this.sendRestrictionsToStartToUser(this._owner!.user.id);
	}

	public captureCard(cardId: number, user: User): void {
		if (!this.isRunning || this.isOnPause) return;
		if (!user) return;
		if (user.id !== this.currentPlayer.user.id) return;
		const card = this._state.field!.cards.find(card => card.id === cardId);
		if (!card || card.captured) return;
		if (!this._state.field!.checkOpportunity(this.currentPlayer.card, card)) return;
		const capturedPlayer = this._state.players.find(player => player.card === card);
		const captured = !!capturedPlayer && capturedPlayer.user !== user;
		const newCard = this._state.field!.capture(card, captured);
		this.createAndApplyCaptureLogRecord(card, this.currentPlayer.nickname, captured ? capturedPlayer.nickname : undefined);
		if (captured) {
			this.currentPlayer.score += 1;
			if (this.winCondition) {
				this.sendPlayersToAll();
				this.win();
				return;
			}
			if (newCard) {
				capturedPlayer.card = newCard;
				this.sendCardToUser(capturedPlayer.user.id, newCard);
			}
		}
		this.letNextPlayerToActAndLaunchTimer();
	}

	public askCard(cardId: number, user: User): void {
		if (!this.isRunning || this.isOnPause) return;
		if (!user) return;
		if (user.id !== this.currentPlayer.user.id) return;
		const card = this._state.field!.cards.find(card => card.id === cardId);
		if (!card || card.captured) return;
		if (!this._state.field!.checkOpportunity(this.currentPlayer.card, card)) return;
		const spiesCount = this._state.field!.ask(card, this.cardsOfPlayers.filter(playerCard => playerCard !== this.currentPlayer.card));
		this.createAndApplyAskLogRecord(card, this.currentPlayer.nickname, spiesCount);
		this.letNextPlayerToActAndLaunchTimer();
	}

	public requestOptionsOfCards(user: User): void {
		if (!user) return;
		this.sendOptionsOfCardsToUser(user.id);
	}

	private sendLastWinnerToAll() { this.channel.emit(Events.GET_LAST_WINNER, this._state.winner); }
	private sendLastWinnerToUser(userId: string) { this._server.to(userId).emit(Events.GET_LAST_WINNER, this._state.winner); }

	private sendFieldCardsToAll() { this.channel.emit(Events.GET_FIELD_CARDS, this._state.field!.cards); }
	private sendFieldCardsToUser(userId: string) { this._server.to(userId).emit(Events.GET_FIELD_CARDS, this._state.field!.cards); }

	private sendSizesToAll() { this.channel.emit(Events.GET_SIZES, this._state.field!.sizes); }
	private sendSizesToUser(userId: string) { this._server.to(userId).emit(Events.GET_SIZES, this._state.field!.sizes); }

	private sendOptionsOfCardsToAll() { this.channel.emit(Events.GET_ROOM_OPTIONS_OF_CARDS, this._optionsOfCards); }
	private sendOptionsOfCardsToUser(userId: string) { this._server.to(userId).emit(Events.GET_ROOM_OPTIONS_OF_CARDS, this._optionsOfCards); }

	private sendCardToUser(userId: string, card: FieldCard) { this._server.to(userId).emit(Events.GET_CARD, card); }

	private sendActCardIdsToUser(userId: string, actCardIds: number[]) { this._server.to(userId).emit(Events.GET_ACT_CARD_IDS, actCardIds); }
}
