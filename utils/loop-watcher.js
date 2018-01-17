const LoopFlag = function () {
    this._isActive = false;
};

LoopFlag.prototype = {
    set isActive(flag) {
        this._isActive = flag
    },
    get isActive() {
        return this._isActive
    }
};

module.exports = LoopFlag;