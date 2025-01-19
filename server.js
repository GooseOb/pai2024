const fs = require("fs");

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");
const expressSession = require("express-session");
const passport = require("passport");
const passportJson = require("passport-json");
const { WebSocketServer } = require("ws");

// własne moduły
const auth = require("./auth");
const person = require("./person");
const project = require("./project");
const task = require("./task");

const config = {
  port: 8000,
  frontend: "./pai2024-vue/dist",
  dbUrl: "mongodb://localhost:27017/pai2024",
};

try {
  Object.assign(config, JSON.parse(fs.readFileSync("config.json")));
  console.log("Konfiguracja z config.json");
} catch (err) {
  console.log("Konfiguracja domyślna");
}

const app = express();

app.use(morgan("tiny"));
app.use(cors());
app.use(bodyParser.json());
app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

app.use(express.static(config.frontend));

// inicjalizacja mechanizmów utrzymania sesji i autoryzacji
app.use(
  expressSession({
    secret: config.dbUrl,
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new passportJson.Strategy(auth.checkCredentials));
passport.serializeUser(auth.serialize);
passport.deserializeUser(auth.deserialize);

// endpointy autentykacji
const authEndpoint = "/api/auth";
app.get(authEndpoint, auth.whoami);
app.post(
  authEndpoint,
  passport.authenticate("json", { failWithError: true }),
  auth.login,
  auth.errorHandler,
);
app.delete(authEndpoint, auth.logout);

app.get(person.endpoint, auth.checkIfInRole([0, 1]), person.get);
app.post(person.endpoint, auth.checkIfInRole([0]), person.post);
app.put(person.endpoint, auth.checkIfInRole([0]), person.put);
app.delete(person.endpoint, auth.checkIfInRole([0]), person.delete);

app.get(project.endpoint, auth.checkIfInRole([0, 1]), project.get);
app.post(project.endpoint, auth.checkIfInRole([0]), project.post);
app.put(project.endpoint, auth.checkIfInRole([0]), project.put);
app.delete(project.endpoint, auth.checkIfInRole([0]), project.delete);

app.get(task.endpoint, auth.checkIfInRole([0, 1]), task.get);
app.post(task.endpoint, auth.checkIfInRole([0]), task.post);
app.put(task.endpoint, auth.checkIfInRole([0]), task.put);
app.delete(task.endpoint, auth.checkIfInRole([0]), task.delete);

console.log("Łączę się z bazą danych...");
mongoose
  .connect(config.dbUrl)
  .then((conn) => {
    console.log("Połączenie z bazą danych nawiązane");

    auth.init(conn);
    person.init(conn);
    project.init(conn);
    task.init(conn);

    const server = app.listen(config.port, () => {
      console.log("Backend słucha na porcie", config.port);
    });

    // WebSocket Server
    const wss = new WebSocketServer({ server });
    console.log("WebSocket server initialized");

    // Broadcast function to notify all clients
    const broadcast = (message) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    };

    // Notify clients about project changes
    project.onUpdate = (entityId) => {
      broadcast({
        type: "update",
        entity: "project",
        entityId,
      });
    };

    // Notify clients about task changes
    task.onUpdate = (entityId) => {
      broadcast({
        type: "update",
        entity: "task",
        entityId,
      });
    };

    // Handle WebSocket connection
    wss.on("connection", (ws) => {
      console.log("New WebSocket connection established");

      ws.on("message", (message) => {
        console.log("Received message from client:", message);
      });

      ws.on("close", () => {
        console.log("WebSocket connection closed");
      });
    });
  })
  .catch((err) => {
    console.error("Połączenie z bazą danych nieudane:", err.message);
    process.exit(0);
  });
