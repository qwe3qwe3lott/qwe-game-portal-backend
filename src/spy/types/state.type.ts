import {Field} from '../entities/field.entity';
import {Player} from '../entities/player.entity';

export type State = {
    players: Player[]
    field: Field
}