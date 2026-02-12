export function loggingWarning(message) {
  const prefix = new Date().toISOString();
  console.warn(`${prefix} - WARNING: ${message}`);
}

export function loggingInfo(message) {
  const prefix = new Date().toISOString();
  console.info(`${prefix} - INFO: ${message}`);
}
