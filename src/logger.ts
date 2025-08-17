import config from './config';

export function log(message: string, ...args: any[]) {
  if (config.DEBUG_MODE) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

export function error(message: string, ...args: any[]) {
  console.error(`[ERROR] ${message}`, ...args);
}
