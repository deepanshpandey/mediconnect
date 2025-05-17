const { createLogger, format, transports, Transport } = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');
const net = require('net');

const env = process.env.NODE_ENV || 'development';

const logDir = 'log';
const datePatternConfiguration = {
  default: 'YYYY-MM-DD',
  everHour: 'YYYY-MM-DD-HH',
  everMinute: 'YYYY-MM-DD-THH-mm',
};
const numberOfDaysToKeepLog = 30;
const fileSizeToRotate = 1; // in megabyte

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Custom Logstash TCP transport
class LogstashTcpTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.host = opts.host || 'logstash';
    this.port = opts.port || 5000;
    this.connected = false;
    this.queue = [];
    this.connect();
  }

  connect() {
    this.client = new net.Socket();

    this.client.connect(this.port, this.host, () => {
      this.connected = true;
      // Flush queued logs
      this.queue.forEach(log => this.client.write(log));
      this.queue = [];
    });

    this.client.on('error', (err) => {
      this.connected = false;
      // Try reconnecting after 5 seconds
      setTimeout(() => this.connect(), 5000);
    });

    this.client.on('close', () => {
      this.connected = false;
      setTimeout(() => this.connect(), 5000);
    });
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Format log as JSON string with newline for Logstash json_lines codec
    const message = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: info.level,
      message: info.message,
      label: info.label
    }) + '\n';

    if (this.connected) {
      this.client.write(message);
    } else {
      this.queue.push(message);
    }

    callback();
  }
}

const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: `${logDir}/%DATE%-results.log`,
  datePattern: datePatternConfiguration.everHour,
  zippedArchive: true,
  maxSize: `${fileSizeToRotate}m`,
  maxFiles: `${numberOfDaysToKeepLog}d`
});

const logger = createLogger({
  level: env === 'development' ? 'verbose' : 'info',
  handleExceptions: true,
  format: format.combine(
    format.label({ label: path.basename(module.parent.filename) }),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.printf(info => `${info.timestamp}[${info.label}] ${info.level}: ${JSON.stringify(info.message)}`),
  ),
  transports: [
    new transports.Console({
      level: 'info',
      handleExceptions: true,
      format: format.combine(
        format.label({ label: path.basename(module.parent.filename) }),
        format.colorize(),
        format.printf(
          info => `${info.timestamp}[${info.label}] ${info.level}: ${info.message}`,
        ),
      ),
    }),
    dailyRotateFileTransport,
    new LogstashTcpTransport({ host: process.env.LOGGING_HOST || 'logstash', port: parseInt(process.env.LOGGING_PORT) || 5000 }),
  ],
});

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
