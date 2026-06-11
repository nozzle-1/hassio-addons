import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const addonDir = path.join(repoRoot, "spoolman-tracker");
const configPath = path.join(addonDir, "config.yaml");
const dockerfilePath = path.join(addonDir, "Dockerfile");
const readmePath = path.join(addonDir, "README.md");

const targetVersion = process.env.TARGET_VERSION?.trim();
const outputPath = process.env.GITHUB_OUTPUT;

if (!targetVersion || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(targetVersion)) {
  throw new Error(`Invalid TARGET_VERSION: ${targetVersion ?? "<missing>"}`);
}

function setOutput(name, value) {
  if (!outputPath) {
    return;
  }

  fs.appendFileSync(outputPath, `${name}=${value}\n`, "utf8");
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeFileIfChanged(filePath, content) {
  const current = readFile(filePath);
  if (current === content) {
    return false;
  }

  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

const config = readFile(configPath);
const versionMatch = config.match(/^version:\s*([^\s]+)\s*$/m);
if (!versionMatch) {
  throw new Error(`Unable to find addon version in ${configPath}`);
}

const currentAddonVersion = versionMatch[1];
const currentUpstreamVersion = currentAddonVersion.replace(/-\d+$/, "");

setOutput("current_version", currentAddonVersion);
setOutput("upstream_version", currentUpstreamVersion);
setOutput("target_version", targetVersion);

if (currentUpstreamVersion === targetVersion) {
  setOutput("changed", "false");
  process.exit(0);
}

const nextAddonVersion = `${targetVersion}-1`;
const nextConfig = config.replace(
  /^version:\s*[^\s]+\s*$/m,
  `version: ${nextAddonVersion}`
);

const dockerfile = readFile(dockerfilePath);
const nextDockerfile = dockerfile.replace(
  /^FROM\s+ghcr\.io\/nozzle-1\/spoolman-tracker:[^\s]+\s*$/m,
  `FROM ghcr.io/nozzle-1/spoolman-tracker:${targetVersion}`
);

const readme = readFile(readmePath);
const nextReadme = readme.replace(
  /ghcr\.io\/nozzle-1\/spoolman-tracker:[0-9A-Za-z.+-]+/g,
  `ghcr.io/nozzle-1/spoolman-tracker:${targetVersion}`
);

let changed = false;
changed = writeFileIfChanged(configPath, nextConfig) || changed;
changed = writeFileIfChanged(dockerfilePath, nextDockerfile) || changed;
changed = writeFileIfChanged(readmePath, nextReadme) || changed;

setOutput("changed", changed ? "true" : "false");
setOutput("next_addon_version", nextAddonVersion);
