const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mysql = require("mysql2");
const { createConnection } = require("mysql2");
const { faker } = require('@faker-js/faker');
const bodyParser = require('body-parser');


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(bodyParser.json());

// Database configuration
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "socket",
};

// WebSocket connections
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("Client connected");
  clients.add(ws);

  ws.on("message", (message) => {
    console.log("Received message:", message);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });
});

// Function to send data to connected clients
const sendDataToClients = (data) => {
  const payload = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

// Watch database table for new data
const watchDatabase = () => {
  const connection = createConnection(dbConfig);
  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to database:", err);
      return;
    }
    console.log("Connected to the database");

    const query = "SELECT * FROM geo order by id desc limit 1";
    const selectQuery = connection.query(query);

    selectQuery.on("result", (row) => {
      sendDataToClients(row);
      selectQuery.pause(); // Pause further result events

    });

    selectQuery.on("end", () => {
      console.log("Initial data sent to clients");
    });

    const insertQuery = connection.query(
      `SELECT * FROM geo WHERE id > ?`,
      [0] // Assuming id is an auto-incrementing column
    );

    insertQuery.on("result", (row) => {
      sendDataToClients(row);
    });

    insertQuery.on("end", () => {
      console.log("Listening for new data...");
    });
  });
};

// Connect to the database and start watching for new data
watchDatabase();

app.post("/addFromApp", (req, res) => {
  const connection = createConnection(dbConfig);
  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to database:", err);
      return res.status(500).send("Error connecting to database");
    }

    // // Generate random coordinates
    // const lat = faker.location.latitude() ;
    // const lng = faker.location.longitude();
    const lat = req.body.lat ;
    const lng = req.body.lng;

    const data = { lat, lng };
    // console.log(req.body);
    connection.query("INSERT INTO geo SET ?", data, (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).send("Error inserting data into the database");
      }

      console.log("Inserted data into the database:", data);
      res.status(200).send("Data inserted successfully");
    });
  });

  watchDatabase();
});

// Start the server
const port = 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
