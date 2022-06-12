import {Field} from '../entities/field.entity';
import {Player} from '../entities/player.entity';
import {LogRecord} from './log-record.type';

export type State = {
    players: Player[]
    field: Field
    logs: LogRecord[]
}