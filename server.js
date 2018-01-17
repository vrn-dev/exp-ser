const http = require('http');
const app = require('./app');
// PIGPIO
const _ = require('lodash');
const PiGpio = require('pigpio');
const Gpio = PiGpio.Gpio;
// const PiGpioTemp = require('pigpio_temp');
// const GpioTemp = PiGpioTemp.Gpio;
const LoopWatcher = require('./utils/loop-watcher');

// PiGpioTemp.initialize();
PiGpio.initialize();
process.on('SIGINT', () => {
    console.log('Received SIGINT.  Press Control-D to exit.');
    PiGpio.terminate();
    console.log('Terminating ....');
});

const EntryLoop = new Gpio(5, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_DOWN,
    edge: Gpio.EITHER_EDGE
});

const ExitGate = new Gpio(19, {
    mode: Gpio.OUTPUT,
    alert: true
});

const ExitLoop = new Gpio(13, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_DOWN,
    edge: Gpio.EITHER_EDGE
});


const port = process.env.PORT || 3000;
const server = http.createServer(app);
server.listen(port, () => {
    console.info(`Listening on port ${port}`);
});

module.exports = {
    EntryLoop: EntryLoop,
    ExitLoop: ExitLoop,
    ExitGate: ExitGate
};