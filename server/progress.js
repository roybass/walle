class Progress {

	constructor(total, parent, factor) {
		this.curr = 0;
		this.total = total;
		this.parent = parent;
		this.factor = factor;
		this.callbacks = [];
	}

	inc(value) {
		const incValue = value || 1;
		if (this.curr + incValue <= this.total) {
			this.curr += incValue;
		}
		if (this.parent) {
			this.parent.inc(incValue * this.factor);
		}
		this._checkProgressCallbacks();
	}

	end() {
		this.curr = this.total;
	}

	child(partsOfParent, partsInChild) {
		return new Progress(partsInChild, this, partsOfParent / partsInChild);
	}

	getProgress() {
		return {
			total : this.total,
			current: this.curr,
			ratio : (this.curr / this.total)
		};
	}

	onProgress(value, callback) {
		if (Array.isArray(value)) {
			for (const item of value) {
					this.callbacks.push({
					called : false,
					value: item,
					callback
				});
			}
		} else {
			this.callbacks.push({
				called : false,
				value,
				callback
			});			
		}
	}

	_checkProgressCallbacks() {
		const currentRatio = this.getProgress().ratio;
		for (const callback of this.callbacks) {
			if (callback.called) {
				continue;
			}
			if (currentRatio >= callback.value) {
				callback.callback(currentRatio);
				callback.called = true;
			}
		}
	}
}

module.exports = Progress;


/*
const p1 = new Progress(13);
p1.onProgress([0.25, 0.5], (v) => console.log('Reached ' + v));

for (let i = 0 ; i < 10; i++) {
	p1.inc();
}
let p2 = p1.child(3, 2);
p2.inc();
p2.inc();

*/