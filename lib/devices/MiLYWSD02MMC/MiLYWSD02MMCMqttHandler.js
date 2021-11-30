const util = require("util");
const MqttHandler = require("../../MqttHandler");

/**
 * @param options {object}
 * @constructor
 */
const MiLYWSD02MMCMqttHandler = function MiLYWSD02MMCMqttHandler(options) {
    MqttHandler.call(this, options);
    console.log('registerTopicHandler')
    this.registerTopicHandler("set_time", cmd => this.setTime(cmd));

    this.lastState = null;
};

util.inherits(MiLYWSD02MMCMqttHandler, MqttHandler);

/**
 * @param cmd {object}
 * @param cmd.mode {"boil"|"heat"}
 * @param cmd.temperature {number}
 */
MiLYWSD02MMCMqttHandler.prototype.setTime = function(cmd) {
    console.log('got message set Time', cmd)

    this.device.tryConnectToClock((err) => {
        console.log('CONNECTION ERROR?', err)
        this.device.setTime(cmd, (e) => {
            console.log('Time has been set', e)
            this.device.disconnectClock()
        })
    })
};


module.exports = MiLYWSD02MMCMqttHandler;