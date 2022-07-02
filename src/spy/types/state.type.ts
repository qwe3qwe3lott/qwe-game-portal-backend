import {Field} from '../entities/field.entity';
import {Player} from '../entities/player.entity';
import {RoomState} from '../../types/room-state.type';

export type State = RoomState<Player> & {
    field: Field
    winner: string
}