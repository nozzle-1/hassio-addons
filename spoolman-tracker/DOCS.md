# Spoolman Tracker

This add-on runs `spoolman-tracker` and exposes its configuration through the Home Assistant add-on UI.

## What it does

- Monitors supported 3D printers
- Detects spool weight changes
- Pushes updated `remaining_weight` values to Spoolman

Current platform support:

- `bambulab`

## Installation

1. Add this repository to Home Assistant:
   `Settings` -> `Add-ons` -> `Add-on Store` -> menu `Repositories`
2. Add `https://github.com/nozzle-1/hassio-addons`
3. Install `Spoolman Tracker`

## Configuration

Most settings are available directly in the add-on UI:

- `logging_level`: application log verbosity
- `spoolman_base_url`: Spoolman API URL, usually ending with `/api/v1`
- `spoolman_api_key`: optional API key
- `spoolman_timeout_ms`: Spoolman HTTP timeout
- `supervision_*`: printer reachability probe timings
- `printers`: printers to monitor

Example:

```yaml
logging_level: info
spoolman_base_url: http://spoolman.local:7912/api/v1
spoolman_api_key: ""
spoolman_timeout_ms: 10000
supervision_probe_interval_ms: 15000
supervision_offline_backoff_ms: 30000
supervision_connect_timeout_ms: 5000
printers:
  - id: x1c
    platform: bambulab
    enabled: true
    host: 192.168.1.50
    serial: 01PXXXXXXXXXXXX
    access_code: "12345678"
    username: bblp
    mqtt_port: 8883
    mqtt_connect_timeout_ms: 10000
    mqtt_reconnect_ms: 5000
    push_all_on_connect: false
```

## Notes

- The default printer entry is intentionally disabled so the add-on can be installed before real values are entered.
- `access_code` is the Bambu Lab printer LAN access code.
- This first packaging targets `amd64` because the published upstream image is currently built for that architecture.
