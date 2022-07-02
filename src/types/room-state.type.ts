import {GamePlayer} from '../abstracts/game-player.abstract';

export type RoomState<P extends GamePlayer> = {
    players: P[]
}