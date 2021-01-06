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
`homeassistant/sensor/miflora_ffffffffffff/ffffffffffff_battery/config`
`homeassistant/sensor/miflora_ffffffffffff/ffffffffffff_temperature/config`
`homeassistant/sensor/miflora_ffffffffffff/ffffffffffff_illuminance/config`
`homeassistant/sensor/miflora_ffffffffffff/ffffffffffff_moisture/config`
`homeassistant/sensor/miflora_ffffffffffff/ffffffffffff_conductivity/config`

#### State
`cybele/miflora/ffffffffffff/state` provides the current state as JSON

```
{
    "tem": 23.7,
    "hum": 50,
}
```

#### Properties
`cybele/miflora/ffffffffffff/state` provides the current state as JSON

```
{
  "battery": 25,
  "time": "2021-01-06T10:54:57.000Z"
}
```