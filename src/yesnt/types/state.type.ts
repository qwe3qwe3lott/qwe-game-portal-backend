import {Player} from '../entities/player.entity';
import {RoomState} from '../../types/room-state.type';
import {Result} from './result.type';

export type State = RoomState<Player> & {
    question: string
    result?: Result
}