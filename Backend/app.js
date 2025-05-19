const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mysql = require("mysql2");
const client = require("prom-client");
const logger = require("./logger");
const userRouter = require("./users/user.router");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// === Prometheus Metrics Setup ===
client.collectDefaultMetrics();

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
});

// === /metrics Endpoint for Prometheus ===
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    logger.error('Error in /metrics endpoint:', err instanceof Error ? err.stack : JSON.stringify(err));
    res.status(500).end('Metrics error');
  }
});

// === Health Check Endpoint ===
app.get('/health', (req, res) => {
  const isHealthy = con && con.state === 'authenticated';
  res.status(isHealthy ? 200 : 500).json({ status: isHealthy ? 'ok' : 'db_error' });
});

// === Metrics Middleware (excluding /metrics and /health) ===
app.use((req, res, next) => {
  if (req.path === '/metrics' || req.path === '/health') return next();

  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
  });
  next();
});

// === API Routes ===
app.use("/api/users", userRouter);

// === MySQL Connection ===
let con;

function handleMySQLConnection() {
  con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.MYSQL_DATABASE
  });

  con.connect((err) => {
    if (err) {
      logger.error('Initial MySQL connection failed. Retrying in 5 seconds...', err.message || err);
      return setTimeout(handleMySQLConnection, 5000);
    }

    logger.info('Connected to MySQL database.');
    initializeDatabase();
  });

  con.on('error', (err) => {
    logger.error('MySQL error:', err.message || err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleMySQLConnection();
    } else {
      throw err;
    }
  });
}

function initializeDatabase() {
  const db = process.env.MYSQL_DATABASE;
  const run = (stmt) => con.query(stmt, (err) => {
    if (err) logger.error('DB Init Error:', err.message || err);
  });

  run(`CREATE DATABASE IF NOT EXISTS \`${db}\``);

  run(`CREATE TABLE IF NOT EXISTS \`${db}\`.\`user_doctor\` (
    id INT NOT NULL AUTO_INCREMENT,
    firstname VARCHAR(45) NOT NULL,
    lastname VARCHAR(45),
    email VARCHAR(45) NOT NULL,
    password VARCHAR(100) NOT NULL,
    namespace_id VARCHAR(45) NOT NULL,
    specialization ENUM (
      'Cardiologist', 'Dermatologist', 'General Medicine (MD)', 'Dentist',
      'Gynecologist', 'Neurologist', 'Physiotherapist', 'Orthopedic'
    ) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX namespace_id_UNIQUE (namespace_id),
    UNIQUE INDEX id_UNIQUE (id),
    UNIQUE INDEX email_UNIQUE (email)
  )`);

  run(`CREATE TABLE IF NOT EXISTS \`${db}\`.\`user_patient\` (
    id INT NOT NULL AUTO_INCREMENT,
    firstname VARCHAR(45) NOT NULL,
    lastname VARCHAR(45),
    email VARCHAR(45) NOT NULL,
    password VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX id_UNIQUE (id),
    UNIQUE INDEX email_UNIQUE (email)
  )`);

  run(`CREATE TABLE IF NOT EXISTS \`${db}\`.\`pending_calls\` (
    id INT NOT NULL AUTO_INCREMENT,
    roomid VARCHAR(45) NOT NULL,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (doctor_id) REFERENCES \`${db}\`.user_doctor(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES \`${db}\`.user_patient(id)
      ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  run(`CREATE TABLE IF NOT EXISTS \`${db}\`.\`prescription\` (
    id INT NOT NULL AUTO_INCREMENT,
    details TEXT(1000),
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (doctor_id) REFERENCES \`${db}\`.user_doctor(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES \`${db}\`.user_patient(id)
      ON DELETE CASCADE ON UPDATE CASCADE
  )`);
}

// === Initialize MySQL Connection ===
handleMySQLConnection();

// === Start Server ===
const port = process.env.APP_PORT || 3000;
app.listen(port, () => {
  logger.info(`Backend up and running on PORT : ${port}`);
});

// === Safe Global Error Handlers ===
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err instanceof Error ? err.stack : JSON.stringify(err));
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED PROMISE REJECTION:', reason instanceof Error ? reason.stack : JSON.stringify(reason));
});
