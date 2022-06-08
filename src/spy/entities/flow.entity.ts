export class Flow {
    private _timeout?: ReturnType<typeof setTimeout>
    private _timeoutStartMoment?: number
    private _timeoutAction?: () => void
    private _leftTime?: number
	private _delay?: number

	checkout(action: () => void, delay: number) {
    	if (this._timeout) clearTimeout(this._timeout);
    	this._timeout = setTimeout(action, delay * 1000);
    	this._timeoutStartMoment = Date.now();
    	this._delay = delay * 1000;
    	this._timeoutAction = action;
	}

	pause() {
    	if (this._timeout) {
    		this._leftTime = this._delay - (Date.now() - this._timeoutStartMoment);
    		clearTimeout(this._timeout);
    		this._timeout = undefined;
    		console.log('pause', this._leftTime);
    	}
	}

	resume() {
    	if (!this._timeout && this._timeoutAction && this._leftTime) {
    		this._timeout = setTimeout(this._timeoutAction, this._leftTime);
    		this._delay = this._leftTime;
    		this._timeoutStartMoment = Date.now();
    		console.log('resume', this._leftTime);
    	}
	}
    
	stop() {
    	if (this._timeout){
    	    clearTimeout(this._timeout);
    	    this._timeout = undefined;
    	}
	}
}