export interface DeletableRoom {
    checkActivity: () => boolean
    increaseFailedChecksCount: () => number
    delete: () => void
}