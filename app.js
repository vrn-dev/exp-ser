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

const app = express();

const routes = require('./routes');

// PiGpioTemp.initialize();
PiGpio.initialize();
process.on('SIGINT', () => {
    console.log('Received SIGINT.  Press Control-D to exit.');
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
    if ( level === 0 )
        exitLoopActive.isActive(true);
    else if ( level === 1 )
        exitLoopActive.isActive(false);
    if ( !exitLoopActive.isActive && transiting.isTransiting ) {
        ExitGateClose.digitalWrite(0);
        setTimeout(() => ExitGateClose.digitalWrite(1), 100);
        transiting.isTransiting(false);
    }
}, 100));

EntryLoop.on('interrupt', _.debounce((level) => {
    if ( level === 0 )
        entryLoopActive.isActive(true);
    else if ( level === 1 )
        entryLoopActive.isActive(false);
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
        ExitGateOpen.digitalWrite(0);
        setTimeout(() => ExitGateOpen.digitalWrite(1), 100);
        transiting.isTransiting(true);
        res.status(200).json({ message: 'Gate opened' });
    }
    res.status(403).json({ message: 'No car present on Entry Loop' })
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