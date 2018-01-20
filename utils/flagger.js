const Flagger = function () {
    this._isTransiting = false;
};

Flagger.prototype = {
    set isTransiting(flag) {
        this._isTransiting = flag;
    },
    get isTransiting() {
        return this._isTransiting;
    }
};

module.exports = Flagger;