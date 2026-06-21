// @ts-ignore
import pino from 'pino';

const loggerInstance = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const logger = {
  info: (msg: any, ...args: any[]) => loggerInstance.info(msg, ...args),
  error: (msg: any, ...args: any[]) => loggerInstance.error(msg, ...args),
  warn: (msg: any, ...args: any[]) => loggerInstance.warn(msg, ...args),
  debug: (msg: any, ...args: any[]) => loggerInstance.debug(msg, ...args),
};
