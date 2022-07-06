import {GameRoomOptions} from '../types/game-room-options.type';

export type OptionsDto<O extends GameRoomOptions> = {
    ownerKey: string
    options: O
}