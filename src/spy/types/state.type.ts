import {Field} from '../entities/field.entity';
import {Player} from '../entities/player.entity';
import {LogRecord} from './log-record.type';
import {RoomState} from '../../types/room-state.type';

export type State = RoomState<Player> & {
    field: Field
    logs: LogRecord[]
    winner: string
}