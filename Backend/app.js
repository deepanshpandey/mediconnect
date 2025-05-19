const logger = require('./logger');
require("dotenv").config();
const express = require("express");
const cors = require('cors');
const userRouter = require("./users/user.router");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/users", userRouter);

app.get('/health', (req, res) => {
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
  con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.MYSQL_DATABASE
  });

  con.connect((err) => {
    if (err) {
      logger.error('Initial MySQL connection failed. Retrying in 5 seconds...', err.message);
      setTimeout(handleMySQLConnection, 5000); // Retry after delay
    } else {
      logger.info('Connected to MySQL database.');

      // Create tables if not exist
      initializeDatabase();
    }
  });

  con.on('error', (err) => {
    logger.error('MySQL error: ', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleMySQLConnection(); // Retry on lost connection
    } else {
      throw err;
    }
  });
}

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
  logger.error('UNCAUGHT EXCEPTION:', err.stack || err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED PROMISE REJECTION:', reason);
});