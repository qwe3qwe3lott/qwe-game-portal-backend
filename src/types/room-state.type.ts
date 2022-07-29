import {GamePlayer} from '../abstracts/game-player.abstract';
import {LogRecord} from './log-record.type';

export type RoomState<PLAYER extends GamePlayer> = {
    players: PLAYER[]
    logs: LogRecord[]
}