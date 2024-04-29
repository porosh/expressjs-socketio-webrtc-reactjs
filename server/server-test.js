const express = require("express");
const http = require("http");
const cors = require("cors");
const app = express();
const PORT = 5001;
process.env.JWT_SECRECT_KEY = "#%T%YG%";

const { Server } = require("socket.io");
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  // Enable reconnection
  reconnection: true,
  // Number of reconnection attempts
  reconnectionAttempts: Infinity,
  // Delay between each reconnection attempt (in milliseconds)
  reconnectionDelay: 1000,
  // Maximum delay between reconnection attempts
  reconnectionDelayMax: 5000,
  // Randomization factor to vary the reconnection delay
  randomizationFactor: 0.5,
});

server.listen(PORT, () => {
  console.log("server is running");
});

// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;
//   console.log("token = " + token);
//   try {
//     // const decoded = jwt.verify(token, process.env.JWT_SECRECT_KEY);
//     // socket.decoded = decoded;
//     next();
//   } catch (err) {
//     // err
//     next(new Error("unable to decode jwt token"));
//   }
// });

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
  });

  socket.on("connec_error", () => {
    console.log("🔥: A user disconnected");
  });

  socket.on("message", (data) => {
    console.log("🔥: message = " + data);
    //io.emit("message", "world");
    socket.emit("message", data);
  });
});

// app.get("/api", (req, res) => {
//   res.json({
//     message: "Hello world",
//   });
// });

// http.listen(PORT, () => {
//   console.log(`Server listening on ${PORT}`);
// });

// const socketIO = require("socket.io")(http, {
//   cors: {
//     origin: "http://localhost:3000",
//   },
// });

// //Add this before the app.get() block
// socketIO.on("connection", (socket) => {
//   console.log(`⚡: ${socket.id} user just connected!`);
//   socket.on("disconnect", () => {
//     console.log("🔥: A user disconnected");
//   });

//   socket.on("connec_error", () => {
//     console.log("🔥: A user disconnected");
//   });
// });
