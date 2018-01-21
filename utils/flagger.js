const Flagger = function () {
    this._isTransiting = false;
    this._ticketClosed = false;
};

Flagger.prototype = {
    set isTransiting(flag) {
        this._isTransiting = flag;
    },
    get isTransiting() {
        return this._isTransiting;
    },
    set isTicketClosed(flag) {
        this._ticketClosed = flag;
    },
    get isTicketClosed() {
        return this._ticketClosed;
    }
};

module.exports = Flagger;