# Xiaomi Mijia LYWSD02MMC Digital Hygrometer
![The Device](https://user-images.githubusercontent.com/2125129/57232734-86d55080-701d-11e9-8505-e92ed88a654c.jpg)

Please replace `FF:FF:FF:FF:FF:FF` as well as `ffffffffffff` with your devices mac.

## Device Config Entry
```
    {
      "type": "MiLYWSD02MMCDevice",
      "friendlyName": "Bathroom Clock",
      "mac": "FF:FF:FF:FF:FF:FF",
      "pollOnStartup": true,
      "pollingInterval": 600000
    },
```

`pollingInterval` the interval this module will use to fetch battery information in milliseconds

If `pollOnStartup` is set to true, the first polling will happen 1s after startup.

## MQTT

#### Autoconfig
The device will attempt to autoconfigure Home Assistant for state information on the following topics:
`homeassistant/sensor/MiLYWSD02MMC/ffffffffffff_temperature/config`
`homeassistant/sensor/MiLYWSD02MMC/ffffffffffff_humidity/config`
`homeassistant/sensor/MiLYWSD02MMC/ffffffffffff_battery/config`

#### State
`cybele/MiLYWSD02MMC/ffffffffffff/state` provides the current state as JSON

```
{
    "tem": 23.7,
    "hum": 50,
}
```

#### Properties
`cybele/MiLYWSD02MMC/ffffffffffff/props` provides the current properties as JSON

```
{
  "battery": 25,
  "time": "2021-01-06T10:54:57.000Z"
}
```