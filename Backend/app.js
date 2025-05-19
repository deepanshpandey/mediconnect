import logger from './logger.js';
import client from 'prom-client';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import userRouter from "./users/user.router.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/users", userRouter);

// === Prometheus metrics setup ===
client.collectDefaultMetrics(); // collects CPU, memory, etc.

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
});

// Metrics middleware (excludes /metrics and /health)
app.use((req, res, next) => {
  if (req.path === '/metrics' || req.path === '/health') return next();

  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });
  next();
});

app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    logger.error('Metrics endpoint error:', err);
    res.status(500).end('Error collecting metrics');
  }
});

app.get('/health', (_req, res) => {
  if (con && con.state === 'authenticated') {
    res.status(200).send('OK');
  } else {
    res.status(500).send('DB not connected');
  }
});


// === MYSQL CONNECTION HANDLER WITH RETRY ===
const mysql = require('mysql2');
let con;
function handleMySQLConnection() {
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
  };

  // Connect without the database to ensure the DB exists
  con = mysql.createConnection(dbConfig);

  con.connect((err) => {
    if (err) {
      logger.error('Initial MySQL connection failed. Retrying in 5 seconds...', err.message);
      return setTimeout(handleMySQLConnection, 5000); // Retry after delay
    } else {
      // Create the database if it does not exist, then switch to it
      con.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE}\`;`, (err) => {
        if (err) {
          logger.error('Error creating database:', err.message);
          return setTimeout(handleMySQLConnection, 5000);
        }
        con.changeUser({database: process.env.MYSQL_DATABASE}, (err) => {
          if (err) {
            logger.error('Error switching to the database:', err.message);
            return setTimeout(handleMySQLConnection, 5000);
          }
          logger.info('Connected to MySQL database.');
          // Create tables if not exist
          initializeDatabase();
        });
      });
    }
  });
}

  con.on('error', (err) => {
    logger.error('MySQL error: ', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleMySQLConnection(); // Retry on lost connection
    } else {
      throw err;
    }
  });

// === Create DB & Tables ===
function initializeDatabase() {
  const db = process.env.MYSQL_DATABASE;
  const run = (stmt) => con.query(stmt, (err) => { if (err) logger.error(err); });

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

// Initialize MySQL
handleMySQLConnection();

// === Express Listener ===
const port = process.env.APP_PORT || 3000;
app.listen(port, () => {
  logger.info(`Backend up and running on PORT : ${port}`);
});

// === Optional: Handle unexpected exceptions gracefully ===
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED PROMISE REJECTION:', reason);
});
