'use strict';
const express = require('express');
const router = express.Router();
const Listeners = require('../server');
const _ = require('lodash');
const PiGpio = require('pigpio');
const Gpio = PiGpio.Gpio;
// const PiGpioTemp = require('../pigpio_temp');
// const GpioTemp = PiGpioTemp.Gpio;
const LoopWatcher = require('../utils/loop-watcher');

// const EntryLoop = Listeners.EntryLoop;
// const ExitLoop = Listeners.ExitLoop;
// const ExitGate = Listeners.ExitGate;
const entryLoopActive = new LoopWatcher();
const exitLoopActive = new LoopWatcher();


router.get('/presence', (req, res, next) => {
    const entryLoopVal = EntryLoop.digitalRead();
    if ( entryLoopVal === 0 )
        res.status(200).json({ state: true });
    else if ( entryLoopVal === 1 )
        res.status(200).json({ state: false });
    else res.status(500).json({ state: 'unable to read' });
});

router.get('/open', (req, res, next) => {
    const entryLoopVal = EntryLoop.digitalRead();
    const exitLoopVal = ExitLoop.digitalRead();

    ExitGate.trigger(100, 1);
    let isTransiting = true;
    let exitLoopActive = false;
    ExitLoop.on('interrupt', _.debounce((level) => {
        if ( level === 1 )
            exitLoopActive = true;
        else if ( level === 0 )
            exitLoopActive = false;

        if ( isTransiting && !exitLoopActive ) {
            ExitGate.trigger(100, 1);
            res.status(200).json({ state: 'exited' });
        }
    }, 100));
});