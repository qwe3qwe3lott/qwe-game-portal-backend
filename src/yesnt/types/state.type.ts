import {Player} from '../entities/player.entity';
import {RoomState} from '../../types/room-state.type';
import {RoomStatus} from './room-status.type';
import {Result} from './result.type';

export type State = RoomState<Player> & {
    roomStatusBeforePause: RoomStatus
    question: string
    result?: Result
}