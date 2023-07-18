const express = require("express");
const http = require("http");
const { createConnection } = require("mysql2");
const EventSource = require("eventsource");
const { faker } = require("@faker-js/faker");

const app = express();
const server = http.createServer(app);

// Database configuration
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "socket",
};

// SSE clients
const clients = new Set();

// Function to send data to connected clients
const sendDataToClients = (data) => {
  const payload = JSON.stringify(data);
  clients.forEach((client) => {
    client.write(`data: ${payload}\n\n`);
  });
};

// Watch database table for new data
const watchDatabase = () => {
  const connection = createConnection(dbConfig);
  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to the database:", err);
      return;
    }
    console.log("Connected to the database");

    const query = "SELECT * FROM geo ORDER BY id DESC LIMIT 1";
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

app.get("/addFromApp", (req, res) => {
  const connection = createConnection(dbConfig);
  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to the database:", err);
      return res.status(500).send("Error connecting to the database");
    }

    // Generate random coordinates
    const lat = faker.location.latitude();
    const lng = faker.location.longitude();
    // const lat = req.body.lat;
    // const lng = req.body.lng;

    const data = { lat, lng };

    connection.query("INSERT INTO geo SET ?", data, (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).send("Error inserting data into the database");
      }

      console.log("Inserted data into the database:", data);
      //   sendDataToClients(data);
      watchDatabase();
      sendDataToClients("sukses");
      res.status(200).send("Data inserted successfully");
    });
  });
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
});

// SSE endpoint for clients to receive updates
app.get("/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
});

// Send SSE events periodically
setInterval(() => {
  const data = { message: "This is a periodic SSE event" };
  sendDataToClients(data);
}, 5000); // Send event every 5 seconds

// Start the server
const port = 3000;
server.listen(port, () => {
  console.log(`SSE server listening on port ${port}`);
});
