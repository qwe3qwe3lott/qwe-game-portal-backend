import {Server} from 'socket.io';
import {User} from '../../types/user.type';
import {GameRoom} from '../../abstracts/game-room.abstract';
import {Player} from './player.entity';
import {State} from '../types/state.type';
import {RoomStatus} from '../types/room-status.type';
import {RoomOptions} from '../types/room-options.type';
import {Member} from '../../types/member.type';
import {v4 as uuidv4} from 'uuid';
import {Answers} from '../enums/answers.enum';
import {Events} from '../enums/events.enum';
import {Result} from '../types/result.type';

export class Room extends GameRoom<Player, State, RoomStatus, RoomOptions> {
	protected get restrictionsToStart(): string[] {
		const restrictions: string[] = [];
		const playersAmongMembersCount = this.playersAmongMembers.length;
		if (playersAmongMembersCount < this._options.minPlayers) restrictions.push('Недостаточно игроков');
		if (playersAmongMembersCount > this._options.maxPlayers) restrictions.push('Слишком много игроков');
		return restrictions;
	}
	protected get playersPayload() { return this._state.players.map(player => ({ id: player.id, nickname: player.nickname })); }
	private readonly _askTimeoutAction: () => void
	private readonly _answerTimeoutAction: () => void
	public constructor(server: Server) {
    	super(server);
    	this._askTimeoutAction = () => {
    		this.letNextPlayerToAskAndLaunchTimer(true);
		};
		this._answerTimeoutAction = () => {
			this.letNextPlayerToAskAndLaunchTimer(false);
		};
	}

	private static readonly MIN_MIN_PLAYERS = 2;
	private static readonly MAX_MIN_PLAYERS = 8;
	private static readonly MIN_MAX_PLAYERS = 2;
	private static readonly MAX_MAX_PLAYERS = 8;
	private static readonly MIN_SECONDS_TO_ASK = 15;
	private static readonly MAX_SECONDS_TO_ASK = 180;
	private static readonly MIN_SECONDS_TO_ANSWER = 15;
	private static readonly MAX_SECONDS_TO_ANSWER = 180;
	protected applyOptions(options: RoomOptions): void {
		this._options = {
			minPlayers: (options.minPlayers && options.minPlayers <= Room.MAX_MIN_PLAYERS && options.minPlayers >= Room.MIN_MIN_PLAYERS)
				? options.minPlayers : 2,
			maxPlayers: (options.maxPlayers && options.maxPlayers <= Room.MAX_MAX_PLAYERS && options.maxPlayers >= Room.MIN_MAX_PLAYERS)
				? options.maxPlayers : 8,
			secondsToAsk: (options.secondsToAsk && options.secondsToAsk <= Room.MAX_SECONDS_TO_ASK && options.secondsToAsk >= Room.MIN_SECONDS_TO_ASK)
				? options.secondsToAsk : 60,
			secondsToAnswer:(options.secondsToAnswer && options.secondsToAnswer <= Room.MAX_SECONDS_TO_ANSWER && options.secondsToAnswer >= Room.MIN_SECONDS_TO_ANSWER)
				? options.secondsToAnswer : 60
		};
		if (this._options.minPlayers > this._options.maxPlayers) this._options.minPlayers = this._options.maxPlayers;
	}
	protected getDefaultOptions(): RoomOptions { return { minPlayers: 2, maxPlayers: 8, secondsToAsk: 60, secondsToAnswer: 60 }; }

	protected get isRunning() { return this._status === 'ask' || this._status === 'answer'; }
	protected get isAsking() { return this._status === 'ask'; }
	protected get isAnswering() { return this._status === 'answer'; }

	public delete(): void {
		// TODO: очистить комнату
		if (this.isRunning) {
			this._status = 'idle';
			this._flow.stop();
		}
	}

	private letNextPlayerToAskAndLaunchTimer(skip: boolean): void {
		if (!skip) this.processAnswersOfPlayers();
		this.sendActFlagToUser(this.currentPlayer.user.id, false);
		this.nextCurrentPlayer();
		this.sendActFlagToUser(this.currentPlayer.user.id, true);
		this.sendPlayersToAll();
		this._flow.checkout(this._askTimeoutAction, this._options.secondsToAsk);
		this.sendTimerToAll();
		if (!skip) {
			this._status = 'ask';
			this.sendRoomStatusToAll();
		}
	}
	private letPlayersToAnswerAndLaunchTimer(): void {
		this.sendQuestionToAll();
		this._flow.checkout(this._answerTimeoutAction, this._options.secondsToAnswer);
		this.sendTimerToAll();
		this._status = 'answer';
		this.sendRoomStatusToAll();
	}
	private processAnswersOfPlayers(): void {
		const result: Result = { question: this._state.question, silenceCount: 0, noCount: 0, yesCount: 0 };
		for (const player of this._state.players) {
			switch (player.answer) {
			case Answers.YES:
				result.yesCount += 1;
				break;
			case Answers.NO:
				result.noCount += 1;
				break;
			case Answers.SILENCE:
				result.silenceCount += 1;
				break;
			default:
				result.silenceCount += 1;
			}
			player.answer = undefined;
		}
		this._state.result = result;
		this.sendResultToAll();
	}

	public start(ownerKey: string): void {
		this._logger.log('EVENT: Owner tries to start the game');
		if (this.isRunning)
			return this._logger.log('FAIL: Game is already running');
		if (ownerKey !== this._ownerKey)
			return this._logger.log('FAIL: Owner key denied');
		if (this.restrictionsToStart.length > 0)
			return this._logger.log('FAIL: Restrictions to start were not passed');
		this._logger.log('SUCCESS: Owner started the game');
		// Формируем очередь из игроков в случайном порядке
		let players: Player[] = [];
		const playersAmongMembers = this.playersAmongMembers;
		for (let i = 0; i < playersAmongMembers.length; i++) {
			players.push(new Player(playersAmongMembers[i].user, i+1));
		}
		players = players.sort(() => 0.5 - Math.random());
		// Создаём новое состояние для матча
		this._state = {
			players,
			logs: [],
			roomStatusBeforePause: 'ask',
			question: ''
		};
		// Запускаем поток событий
		this._status = 'ask';
		this._flow.checkout(this._askTimeoutAction, this._options.secondsToAsk);
		// Отправляем данные пользователям
		this.sendActFlagToAll(false);
		this.sendActFlagToUser(this.currentPlayer.user.id, true);
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

	public ask(question: string, user: User): void {
		this._logger.log(`EVENT: User ${user?.id} tries to ask question`);

		if (!this.isAsking || this.isOnPause)
			return this._logger.log('FAIL: It is not asking time or game is on pause');
		if (!user)
			return this._logger.log('FAIL: User is undefined');
		if (user.id !== this.currentPlayer.user.id)
			return this._logger.log('FAIL: User is not allowed to act');

		this._logger.log(`SUCCESS: User ${user.id} asked question`);
		this._state.question = question;
		this.letPlayersToAnswerAndLaunchTimer();
	}

	public skipAsk(user: User): void {
		this._logger.log(`EVENT: User ${user.id} tries to skip his turn to ask question`);

		if (!this.isAsking || this.isOnPause)
			return this._logger.log('FAIL: It is not asking time or game is on pause');
		if (user.id !== this.currentPlayer.user.id)
			return this._logger.log('FAIL: User is not allowed to act');

		this._logger.log(`SUCCESS: User ${user.id} skipped his turn to ask question`);
		this.letNextPlayerToAskAndLaunchTimer(true);
	}

	public answer(answer: Answers, user: User): void {
		this._logger.log(`EVENT: User ${user.id} tries to answer the question`);

		if (!this.isAnswering || this.isOnPause)
			return this._logger.log('FAIL: It is not answering time or game is on pause');
		const player = this._state.players.find(player => player.user.id === user.id);
		if (!player)
			return this._logger.log('FAIL: User is not player');

		this._logger.log(`SUCCESS: User ${user.id} answered the question`);
		player.answer = answer;
		this.sendAnswerToUser(user.id, player.answer);
		for (const player of this._state.players) {
			if (player.answer === undefined) return;
		}
		this._logger.log('ADDITION: All users answered the question');
		this.letNextPlayerToAskAndLaunchTimer(false);
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
		// Наличие this._state говорит о том, что игра хоть раз запускалась
		if (this._state) {
			this.sendPlayersToUser(user.id);
			// Если матч в комнате сейчас идёт
			if (this.isRunning) {
				this.sendRoomStatusToUser(user.id);
				this.sendPauseFlagToUser(user.id);
				this.sendTimerToUser(user.id);
				this.sendQuestionToUser(user.id);
				if (this._state.result) this.sendResultToUser(user.id);
				// Проверяем, если пользователь переподключился к комнате
				const player = this.checkRejoin(user);
				if (player) {
					member.isPlayer = true;
					player.user = user;
					// Проверяем, если пользователь сейчас ходит
					if (this.currentPlayer === player) {
						this.sendActFlagToUser(user.id, true);
					}
					if (this.isAnswering) {
						this.sendAnswerToUser(user.id, player.answer);
					}
				}
			}
			this.sendLogsToUser(user.id);
		}
		this.sendMembersToAll();
		this.sendRestrictionsToStartToUser(this._owner.user.id);
		this._logger.log(`User ${user.id} joined as spectator`);
		return true;
	}

	protected sendQuestionToAll() { this.channel.emit(Events.GET_QUESTION, this._state.question); }
	protected sendQuestionToUser(userId: string) { this._server.to(userId).emit(Events.GET_QUESTION, this._state.question); }

	protected sendAnswerToUser(userId: string, answer: Answers) { this._server.to(userId).emit(Events.GET_ANSWER, answer); }

	protected sendResultToAll() { this.channel.emit(Events.GET_RESULT, this._state.result); }
	protected sendResultToUser(userId: string) { this._server.to(userId).emit(Events.GET_RESULT, this._state.result); }
}