const util = require("util");
const async = require("async");
const Semaphore = require("semaphore");
const PollingDevice = require("./../PollingDevice");
const Device = require("./../Device");

/**
 *
 * @param options
 * @param options.friendlyName {string}
 * @param options.mac {string}
 * @param options.bus {string}
 * @constructor
 */

const MiLYWSD02MMCDevice = function MiLYWSD02MMCDevice(options) {
    PollingDevice.call(this, options);

    this.connectionSemaphore = new Semaphore(1);

};

util.inherits(MiLYWSD02MMCDevice, PollingDevice);

MiLYWSD02MMCDevice.prototype.initialize = function(callback) {

    this.prepareDeviceInterface((err, deviceInterface) => {
        if(!err && deviceInterface) {
            deviceInterface.Connected((err, isConnected) => { //This can actually lie for some reason.
                if (!err && isConnected === true) {
                    console.info(this.friendlyName + " is already connected.");
                    this.connected = true;
                    this.mapServicesAsync().then(() => {
                        this.enableStatusNotifications(err => {
                            if (err) {
                                console.error(err);
                            }
                        })
                    }).catch(err => {
                        console.error(err);
                    })
                }
            })
        }
    });

    async.each([
        {
            topic: "homeassistant/sensor/MiLYWSD02MMC/" + this.id + "_humidity/config",
            payload: {
                "state_topic": MiLYWSD02MMCDevice.MQTT_PREFIX + this.id + "/state",
                "name": this.friendlyName + " Humidity",
                "unique_id": "cybele_humidity_" + this.id,
                "device_class": "humidity",
                "unit_of_measurement": "%",
                "value_template": "{{ value_json.hum }}"
            }
        },
        {
            topic: "homeassistant/sensor/MiLYWSD02MMC/" + this.id + "_temperature/config",
            payload: {
                "state_topic": MiLYWSD02MMCDevice.MQTT_PREFIX + this.id + "/state",
                "name": this.friendlyName + " Temperature",
                "unique_id": "cybele_temperature_" + this.id,
                "device_class": "temperature",
                "unit_of_measurement": "°C",
                "value_template": "{{ value_json.tem }}"
            }
        },
        {
            topic: "homeassistant/sensor/MiLYWSD02MMC/" + this.id + "_battery/config",
            payload: {
                "state_topic": MiLYWSD02MMCDevice.MQTT_PREFIX + this.id + "/props",
                "name": this.friendlyName + " Battery",
                "unique_id": "cybele_battery_" + this.id,
                "device_class": "battery",
                "unit_of_measurement": "%",
                "value_template": "{{ value_json.battery }}"
            }
        }
    ], (autoconfigEntry, done) => {
        this.mqttClient.publish(
          autoconfigEntry.topic,
          JSON.stringify(autoconfigEntry.payload),
          {retain: true},
          err => {
              done(err);
          });
    }, err => {
        if(!err) {
            this.queuePolling();
        }
        callback(err);
    });
};

MiLYWSD02MMCDevice.prototype.poll = async function() {
    let batInfo;
    let timeInfo;

    if (this.connected) {
        try {
            batInfo = MiLYWSD02MMCDevice.PARSE_BATTERY_CHARACTERISTIC(
              await this.readCharacteristicAsync(this.characteristicsByUUID[MiLYWSD02MMCDevice.CHARACTERISTICS.battery])
            );
        } catch (e) {
            console.error(e);
            return this.queuePolling();
        }

        try {
            timeInfo = MiLYWSD02MMCDevice.PARSE_TIME_CHARACTERISTIC(
              await this.readCharacteristicAsync(this.characteristicsByUUID[MiLYWSD02MMCDevice.CHARACTERISTICS.time])
            );
        } catch (e) {
            console.error(e);
            return this.queuePolling();
        }

        if (batInfo && timeInfo) {
            this.mqttClient.publish(MiLYWSD02MMCDevice.MQTT_PREFIX + this.id + "/props", JSON.stringify({
                battery: batInfo.batteryPct,
                time: new Date(timeInfo.timestamp * 1000)
            }), {retain: true}, err => {
                if (err) {
                    console.error(err);
                }
            })
        } else {
            console.info("Got invalid or missing data for " + this.friendlyName, batInfo, timeInfo);
        }
    }
    this.queuePolling();
};

MiLYWSD02MMCDevice.prototype.handleAdvertisingForDevice = function (props) {
    Device.prototype.handleAdvertisingForDevice.call(this, props);

    if(props.Connected !== undefined) {
        this.mqttClient.publish(MiLYWSD02MMCDevice.MQTT_PREFIX + this.id + "/presence", props.Connected ? "online" : "offline");

        if(props.Connected === false) {
            console.info("Disconnected from " + this.friendlyName);
        }
    }

    if(props.RSSI !== undefined) {
        if(props.RSSI < -98) {
            console.info("Signal is very weak. Connection to" + this.friendlyName + " might fail or be unreliable.");
        }
        if (this.connected === false && this.connectionSemaphore.available()) {
            this.connectionSemaphore.take(() => {

                this.connectToClock(err => {
                    if (err) {
                        console.error(this.friendlyName, err, "while connecting");
                    }
                })
            });
        }
    }
};

MiLYWSD02MMCDevice.prototype.handleNotificationForDevice = async function (props) {

    if (props[this.handlesByUUID[MiLYWSD02MMCDevice.CHARACTERISTICS.sensorData]]) {
        const reading = MiLYWSD02MMCDevice.PARSE_DATA(props[this.handlesByUUID[MiLYWSD02MMCDevice.CHARACTERISTICS.sensorData]]);

         if(reading) {
             this.mqttClient.publish(MiLYWSD02MMCDevice.MQTT_PREFIX + this.id + "/state", JSON.stringify({
                 tem: reading.temp,
                 hum: reading.hum,
             }), err => {
                 if(err) {
                     console.error("err",err);
                 }
             })
         } else {
             console.info("Got invalid or missing data for " + this.friendlyName, reading);
         }
    }
};

MiLYWSD02MMCDevice.prototype.connectToClock = function (callback) {
    console.log('Connecting to Clock');
    this.prepareDeviceInterface(async (err, deviceInterface) => {
        if(!err && deviceInterface) {
            try {
                await this.connectDeviceAsync(deviceInterface, 4000); //TODO: does this make sense?
            } catch(e) {
                this.connectionSemaphore.leave(); //This is so confusing it will definitely break at some point
                return callback(e);
            }

            this.mapServicesAsync().then(() => {
                this.enableStatusNotifications(err => {
                    if (err) {
                        console.error(err);
                    }
                })
            }).catch(err => {
                console.error(err);
            })

            this.connectionSemaphore.leave();

        } else {
            callback(new Error("Missing device Interface"))
        }
    })
};

MiLYWSD02MMCDevice.prototype.prepareDeviceInterface = function(callback) {
    this.blueZservice.getInterface(
        this.pathRoot + "/dev_" + this.macInDbusNotation,
        "org.bluez.Device1",
        (err, deviceInterface) => {
            callback(err, deviceInterface);
        }
    );
};

MiLYWSD02MMCDevice.prototype.enableStatusNotifications = function (callback) {
    this.semaphore.take(() => {
        this.characteristicsByUUID[MiLYWSD02MMCDevice.CHARACTERISTICS.sensorData].StopNotify([], err => {
            this.semaphore.leave();
            err = Array.isArray(err) ? err.join(".") : err;
            if(!err || err === "No notify session started") {
                setTimeout(() => {
                    this.semaphore.take(() => {
                        this.characteristicsByUUID[MiLYWSD02MMCDevice.CHARACTERISTICS.sensorData].StartNotify([], err => {
                            this.semaphore.leave();
                            callback(Array.isArray(err) ? err.join(".") : err)
                        });
                    });
                }, 1000) //TODO: Why is this needed?
            } else {
                callback(err)
            }
        })
    });
};

MiLYWSD02MMCDevice.PARSE_DATA = function(buf) {
    if(buf && buf.length === 3) {
        const temp = buf.readUInt16LE(0) / 100;
        return {
            temp: temp,
            hum: buf.readUInt8(2),
        }
    }
};

MiLYWSD02MMCDevice.PARSE_BATTERY_CHARACTERISTIC = function(buf) {
    if(buf) {
        return {
            batteryPct: buf.readUInt8(0)
        }
    }
};

MiLYWSD02MMCDevice.PARSE_TIME_CHARACTERISTIC = function(buf) {
    if(buf) {
        return {
            timestamp: buf.readUInt32LE(0)
        }
    }
};

MiLYWSD02MMCDevice.CHARACTERISTICS = {
    sensorData: "ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6",
    time: "ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6",
    battery: "ebe0ccc4-7a0a-4b0c-8a1a-6ff2997da3a6"
};
MiLYWSD02MMCDevice.MQTT_PREFIX = "cybele/MiLYWSD02MMC/";

module.exports = MiLYWSD02MMCDevice;
