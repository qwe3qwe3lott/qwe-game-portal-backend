import {GamePlayer} from '../abstracts/game-player.abstract';
import {LogRecord} from './log-record.type';

export type RoomState<P extends GamePlayer> = {
    players: P[]
    logs: LogRecord[]
}