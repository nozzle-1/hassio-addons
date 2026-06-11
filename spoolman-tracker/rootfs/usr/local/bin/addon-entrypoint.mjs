import fs from "node:fs";
import { spawn } from "node:child_process";

const OPTIONS_PATH = "/data/options.json";
const APP_CONFIG_PATH = "/data/config.json";

function readOptions() {
  if (!fs.existsSync(OPTIONS_PATH)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(OPTIONS_PATH, "utf8"));
}

function asNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function buildPrinter(printer, index) {
  if (!printer || typeof printer !== "object" || Array.isArray(printer)) {
    throw new Error(`Invalid printer definition at index ${index}`);
  }

  const built = {
    id: asNonEmptyString(printer.id),
    platform: asNonEmptyString(printer.platform) ?? "bambulab",
    enabled: asBoolean(printer.enabled, true),
    host: asNonEmptyString(printer.host),
    serial: asNonEmptyString(printer.serial),
    accessCode: asNonEmptyString(printer.access_code),
    username: asNonEmptyString(printer.username),
    mqttPort: asNumber(printer.mqtt_port),
    mqttConnectTimeoutMs: asNumber(printer.mqtt_connect_timeout_ms),
    mqttReconnectMs: asNumber(printer.mqtt_reconnect_ms),
    pushAllOnConnect: typeof printer.push_all_on_connect === "boolean"
      ? printer.push_all_on_connect
      : undefined
  };

  for (const field of ["id", "host", "serial", "accessCode"]) {
    if (!built[field]) {
      throw new Error(`Missing required printer field "${field}" at index ${index}`);
    }
  }

  return built;
}

function buildConfig(options) {
  const printers = Array.isArray(options.printers) ? options.printers.map(buildPrinter) : [];
  if (printers.length === 0) {
    throw new Error("At least one printer entry is required in the Home Assistant addon options");
  }

  const spoolman = {
    baseUrl: asNonEmptyString(options.spoolman_base_url) ?? "http://spoolman:7912/api/v1",
    timeoutMs: asNumber(options.spoolman_timeout_ms) ?? 10000
  };

  const apiKey = asNonEmptyString(options.spoolman_api_key);
  if (apiKey) {
    spoolman.apiKey = apiKey;
  }

  return {
    logging: {
      level: asNonEmptyString(options.logging_level) ?? "info"
    },
    spoolman,
    supervision: {
      probeIntervalMs: asNumber(options.supervision_probe_interval_ms) ?? 15000,
      offlineBackoffMs: asNumber(options.supervision_offline_backoff_ms) ?? 30000,
      connectTimeoutMs: asNumber(options.supervision_connect_timeout_ms) ?? 5000
    },
    printers
  };
}

function writeConfig(config) {
  fs.writeFileSync(APP_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function main() {
  const options = readOptions();
  const config = buildConfig(options);
  writeConfig(config);

  const child = spawn("node", ["src/index.ts"], {
    env: {
      ...process.env,
      CONFIG_PATH: APP_CONFIG_PATH
    },
    stdio: "inherit"
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", forwardSignal);
  process.on("SIGTERM", forwardSignal);

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main();
