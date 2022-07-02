import {Timer} from '../types/timer.type';

export class Flow {
	private static DELAY_BONUS = 1
    private _timeout?: ReturnType<typeof setTimeout>
    private _timeoutStartMoment?: number
    private _timeoutAction?: () => void
    private _leftTime?: number
	private _delay?: number
	private _checkoutDelay?: number
	private _isPause: boolean
	public get timer(): Timer {
    	return {
    		maxTime: Math.round(this._checkoutDelay / 1000),
			currentTime: Math.round(this._isPause ? this._leftTime / 1000 : (this._delay - (Date.now() - this._timeoutStartMoment)) / 1000)
		};
	}

	constructor() {
    	this._isPause = true;
	}

	public checkout(action: () => void, delay: number) {
    	if (this._timeout) clearTimeout(this._timeout);
    	this._timeout = setTimeout(action, (delay + Flow.DELAY_BONUS) * 1000);
    	this._timeoutStartMoment = Date.now();
    	this._delay = this._checkoutDelay = delay * 1000;
    	this._timeoutAction = action;
    	this._isPause = false;
	}

	public pause() {
    	if (this._timeout) {
    		this._leftTime = this._delay - (Date.now() - this._timeoutStartMoment);
    		clearTimeout(this._timeout);
    		this._timeout = undefined;
			this._isPause = true;
    	}
	}

	public resume() {
    	if (!this._timeout && this._timeoutAction && this._leftTime) {
    		this._timeout = setTimeout(this._timeoutAction, this._leftTime);
    		this._delay = this._leftTime;
    		this._timeoutStartMoment = Date.now();
			this._isPause = false;
    	}
	}

	public stop() {
    	if (this._timeout){
    	    clearTimeout(this._timeout);
    	    this._timeout = undefined;
			this._isPause = true;
    	}
	}
}