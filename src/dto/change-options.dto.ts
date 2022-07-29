import {GameRoomOptions} from '../types/game-room-options.type';

export type ChangeOptionsDto<O extends GameRoomOptions> = {
    ownerKey: string
    options: O
}