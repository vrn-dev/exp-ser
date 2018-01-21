'use strict';
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const _ = require('lodash');
const PiGpio = require('pigpio');
const Gpio = PiGpio.Gpio;

const LoopWatcher = require('./utils/loop-watcher');
const exitLoopActive = new LoopWatcher();
const entryLoopActive = new LoopWatcher();
const Flagger = require('./utils/flagger');
const transiting = new Flagger();
const ticket = new Flagger();

const app = express();

const routes = require('./routes');

// PiGpioTemp.initialize();
PiGpio.initialize();
process.on('SIGINT', () => {
    console.log('Received SIGINT.  Press Control-D to exit.');
    // ExitGateClose.digitalWrite(0);
    // setTimeout(() => ExitGateClose.digitalWrite(1), 100);
    ExitGateOpen.digitalWrite(1);
    ExitGateClose.digitalWrite(1);
    PiGpio.terminate();
    console.log('Terminating ....');
});

const EntryLoop = new Gpio(5, {
    mode: Gpio.INPUT,
    // pullUpDown: Gpio.PUD_DOWN,
    edge: Gpio.EITHER_EDGE
});

const ExitLoop = new Gpio(6, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    edge: Gpio.EITHER_EDGE
});

const ExitGateOpen = new Gpio(13, {
    mode: Gpio.OUTPUT,
    alert: true
});

const ExitGateClose = new Gpio(19, {
    mode: Gpio.OUTPUT,
    alert: true
});

// INIT
ExitGateOpen.digitalWrite(1);
ExitGateClose.digitalWrite(1);

ExitLoop.on('interrupt', _.debounce((level) => {
    if ( level === 0 ) {
        console.log('ExtiLoop Active');
        exitLoopActive.isActive = true;
    }
    else if ( level === 1 ) {
        console.log('ExitLoop Inactive');
        exitLoopActive.isActive = false;
    }
    if ( ticket.isTicketClosed && entryLoopActive.isActive && exitLoopActive.isActive ) {
        console.log('Is Transiting True');
        transiting.isTransiting = true;
    }
    if ( !exitLoopActive.isActive && transiting.isTransiting ) {
        console.log('Gate Closing');
        ExitGateClose.digitalWrite(0);
        setTimeout(() => ExitGateClose.digitalWrite(1), 100);
        transiting.isTransiting = false;
    }
}, 100));

EntryLoop.on('interrupt', _.debounce((level) => {
    if ( level === 0 ) {
        console.log('EntryLoop Active');
        entryLoopActive.isActive = true;
    }
    else if ( level === 1 ) {
        console.log('Entry Loop Inactive');
        entryLoopActive.isActive = false;
    }
}, 100));

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    if ( req.method === 'OPTIONS' ) {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});

// app.use('/api', routes);
app.get('/open-gate', (req, res, next) => {
    if ( entryLoopActive.isActive ) {
        console.log('Gate closing');
        console.log('TicketIssued true');
        ExitGateOpen.digitalWrite(0);
        setTimeout(() => ExitGateOpen.digitalWrite(1), 100);
        ticket.isTicketClosed = true;
        res.status(200).json({ message: 'Gate opened' });
    } else {
        res.status(403).json({ message: 'No car present on Entry Loop' })
    }
});

app.get('/open-test', (req, res, next) => {
    ExitGateOpen.digitalWrite(0);
    setTimeout(() => ExitGateOpen.digitalWrite(1), 100);
    res.status(200).json({ message: 'Gate opened' });
    // if ( entryLoopActive.isActive ) {
    //
    //     ticket.isTicketClosed = true;
    //
    // } else {
    //     res.status(403).json({ message: 'No car present on Entry Loop' })
    // }
});

app.get('/close-test', (req, res, next) => {
    ExitGateClose.digitalWrite(0);
    setTimeout(() => ExitGateClose.digitalWrite(1), 100);
    res.status(200).json({ message: 'Gate closed' });
    // if ( entryLoopActive.isActive ) {
    //
    //     ticket.isTicketClosed = true;
    //
    // } else {
    //     res.status(403).json({ message: 'No car present on Entry Loop' })
    // }
});

app.get('/status', (req, res) => {
    res.status(200).json({
        entryLoop: EntryLoop.digitalRead(),
        gateOpen: ExitGateOpen.digitalRead(),
        gateClose: ExitGateClose.digitalRead(),
        exitLoop: ExitLoop.digitalRead()
    });
});

app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

module.exports = app;