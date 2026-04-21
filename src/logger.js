let verbose = false;

export function setVerbose(enabled) {
  verbose = !!enabled;
}

export function isVerbose() {
  return verbose;
}

export function log(...args) {
  console.log(...args);
}

export function debug(...args) {
  if (verbose) {
    console.log("[DEBUG]", ...args);
  }
}

export function error(...args) {
  console.error(...args);
}
