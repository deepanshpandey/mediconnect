const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const logDir = 'log';

const datePattern = 'YYYY-MM-DD-HH';
const maxFileSizeMB = 1;
const maxFiles = 30;

// Create log directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: `${logDir}/%DATE%-app.log`,
  datePattern,
  zippedArchive: true,
  maxSize: `${maxFileSizeMB}m`,
  maxFiles: `${maxFiles}d`,
  level: 'info',
});

const logger = createLogger({
  level: env === 'development' ? 'debug' : 'info',
  format: format.combine(
    format.label({ label: path.basename(module.parent?.filename || 'app') }),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info =>
      `${info.timestamp} [${info.label}] ${info.level}: ${typeof info.message === 'object' ? JSON.stringify(info.message) : info.message}`
    )
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(info =>
          `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`
        )
      )
    }),
    dailyRotateFileTransport
  ],
  exitOnError: false,
});

logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
