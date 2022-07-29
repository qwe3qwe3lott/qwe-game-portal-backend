import {Server} from 'socket.io';
import {User} from '../../types/user.type';
import {GameRoom} from '../../abstracts/game-room.abstract';
import {Player} from './player.entity';
import {State} from '../types/state.type';
import {RoomStatus} from '../types/room-status.type';
import {RoomOptions} from '../types/room-options.type';
import {Member} from '../../types/member.type';
import {Answers} from '../enums/answers.enum';
import {Events} from '../enums/events.enum';
import {Result} from '../types/result.type';
import {LogRecord} from '../../types/log-record.type';
import {PlayersPayload} from '../types/players-payload.type';

export class Room extends GameRoom<Player, State, RoomStatus, RoomOptions, PlayersPayload> {
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
	protected get countOfAnswers() { return this._state.players.filter(player => player.answer !== undefined).length; }
	public constructor(server: Server) {
    	super(server);
    	this._state = {
    		players: [],
			logs: [],
			question: ''
		};
    	this._askTimeoutAction = () => {
    		this.createAndApplySkipAskLogRecord(this.currentPlayer.nickname, true);
    		this.letNextPlayerToAskAndLaunchTimer(true);
		};
		this._answerTimeoutAction = () => {
			this.letNextPlayerToAskAndLaunchTimer(false);
		};
	}

	private static readonly MIN_MIN_PLAYERS = 3;
	private static readonly MAX_MIN_PLAYERS = 16;
	private static readonly MIN_MAX_PLAYERS = 3;
	private static readonly MAX_MAX_PLAYERS = 16;
	private static readonly MIN_SECONDS_TO_ASK = 15;
	private static readonly MAX_SECONDS_TO_ASK = 180;
	private static readonly MIN_SECONDS_TO_ANSWER = 15;
	private static readonly MAX_SECONDS_TO_ANSWER = 180;
	protected getDefaultOptions(): RoomOptions { return { minPlayers: 3, maxPlayers: 16, secondsToAsk: 60, secondsToAnswer: 60 }; }
	protected applyOptions(options: RoomOptions): void {
		const defaultOptions = this.getDefaultOptions();
		this._options = {
			minPlayers: (options.minPlayers && options.minPlayers <= Room.MAX_MIN_PLAYERS && options.minPlayers >= Room.MIN_MIN_PLAYERS)
				? options.minPlayers : defaultOptions.minPlayers,
			maxPlayers: (options.maxPlayers && options.maxPlayers <= Room.MAX_MAX_PLAYERS && options.maxPlayers >= Room.MIN_MAX_PLAYERS)
				? options.maxPlayers : defaultOptions.maxPlayers,
			secondsToAsk: (options.secondsToAsk && options.secondsToAsk <= Room.MAX_SECONDS_TO_ASK && options.secondsToAsk >= Room.MIN_SECONDS_TO_ASK)
				? options.secondsToAsk : defaultOptions.secondsToAsk,
			secondsToAnswer:(options.secondsToAnswer && options.secondsToAnswer <= Room.MAX_SECONDS_TO_ANSWER && options.secondsToAnswer >= Room.MIN_SECONDS_TO_ANSWER)
				? options.secondsToAnswer : defaultOptions.secondsToAnswer
		};
		if (this._options.minPlayers > this._options.maxPlayers) this._options.minPlayers = this._options.maxPlayers;
	}

	protected get isRunning() { return this._status === 'ask' || this._status === 'answer'; }
	protected get isAsking() { return this._status === 'ask'; }
	protected get isAnswering() { return this._status === 'answer'; }

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
			default:
				result.silenceCount += 1;
			}
			player.answer = undefined;
		}
		this._state.result = result;
		this.sendResultToAll();
		this.createAndApplyResultLogRecord(result);
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
		const players: Player[] = [];
		const playersAmongMembers = this.playersAmongMembers;
		for (let i = 0; i < playersAmongMembers.length; i++) {
			players.push(new Player(playersAmongMembers[i].user, i+1));
		}
		this._state.players = players.sort(() => 0.5 - Math.random());
		this._state.logs = [];
		this._state.question = '';
		delete this._state.result;
		this._status = 'ask';
		this._flow.checkout(this._askTimeoutAction, this._options.secondsToAsk);
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
		this.createAndApplyAskLogRecord(question, user.nickname);
		this.letPlayersToAnswerAndLaunchTimer();
	}

	public skipAsk(user: User): void {
		this._logger.log(`EVENT: User ${user.id} tries to skip his turn to ask question`);

		if (!this.isAsking || this.isOnPause)
			return this._logger.log('FAIL: It is not asking time or game is on pause');
		if (user.id !== this.currentPlayer.user.id)
			return this._logger.log('FAIL: User is not allowed to act');

		this._logger.log(`SUCCESS: User ${user.id} skipped his turn to ask question`);
		this.createAndApplySkipAskLogRecord(user.nickname);
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
		const isFirstAnswerForThisUser = player.answer === undefined;
		player.answer = answer;
		this.sendAnswerToUser(user.id, player.answer);
		if (isFirstAnswerForThisUser) this.sendCountOfAnswersToAll();
		for (const player of this._state.players) {
			if (player.answer === undefined) return;
		}
		this._logger.log('ADDITION: All users answered the question');
		this.letNextPlayerToAskAndLaunchTimer(false);
	}

	private createAndApplyAskLogRecord(question: string, nickname: string): void {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: `"${nickname}" задал вопрос: "${question}"`
		};
		this._state.logs.unshift(logRecord);
		this.sendLogRecordToAll(logRecord);
	}

	private createAndApplySkipAskLogRecord(nickname: string, isTimeout?: boolean): void {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: `${isTimeout ? '(Тайм аут) ' : ''}"${nickname}" пропустил очередь`
		};
		this._state.logs.unshift(logRecord);
		this.sendLogRecordToAll(logRecord);
	}

	private createAndApplyResultLogRecord(result: Result): void {
		const logRecord: LogRecord = {
			id: this._state.logs.length + 1,
			text: `Результат опроса - Да: ${result.yesCount} / Нет: ${result.noCount} / Воздержались: ${result.silenceCount}`
		};
		this._state.logs.unshift(logRecord);
		this.sendLogRecordToAll(logRecord);
	}

	protected onJoinSuccess(member: Member): void {
		const user = member.user;
		this.sendRoomTitleToUser(user.id);
		this.sendOptionsToUser(user.id);
		this.sendPlayersToUser(user.id);
		if (this.isRunning) {
			this.sendRoomStatusToUser(user.id);
			this.sendPauseFlagToUser(user.id);
			this.sendTimerToUser(user.id);
			if (this.isAnswering) {
				this.sendQuestionToUser(user.id);
				this.sendCountOfAnswersToUser(user.id);
			}
			if (this._state.result) this.sendResultToUser(user.id);
			const player = this.checkRejoin(user);
			if (player) {
				member.isPlayer = true;
				player.user = user;
				if (this.currentPlayer === player) {
					this.sendActFlagToUser(user.id, true);
				}
				if (this.isAnswering && !!player.answer) {
					this.sendAnswerToUser(user.id, player.answer);
				}
			}
		}
		this.sendLogsToUser(user.id);
	}

	protected sendQuestionToAll() { this.channel.emit(Events.GET_QUESTION, this._state.question); }
	protected sendQuestionToUser(userId: string) { this._server.to(userId).emit(Events.GET_QUESTION, this._state.question); }

	protected sendAnswerToUser(userId: string, answer: Answers) { this._server.to(userId).emit(Events.GET_ANSWER, answer); }

	protected sendResultToAll() { this.channel.emit(Events.GET_RESULT, this._state.result); }
	protected sendResultToUser(userId: string) { this._server.to(userId).emit(Events.GET_RESULT, this._state.result); }

	protected sendCountOfAnswersToAll() { this.channel.emit(Events.GET_COUNT_OF_ANSWERS, this.countOfAnswers); }
	protected sendCountOfAnswersToUser(userId: string) { this._server.to(userId).emit(Events.GET_COUNT_OF_ANSWERS, this.countOfAnswers); }
}