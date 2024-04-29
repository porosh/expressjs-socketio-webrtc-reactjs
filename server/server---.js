const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors"); // Import the cors middleware
const jwt = require("jsonwebtoken");
const socketioJwt = require("socketio-jwt");
const { v4: uuidv4 } = require("uuid");

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// JWT SHARED KEY
process.env.JWT_SECRECT_KEY = "#%T%YG%";
const PORT = process.env.PORT || 5001;

const app = express();
app.use(express.json());
app.use(cors()); // Use the cors middleware

const { Server } = require("socket.io");
const { setInterval } = require("timers/promises");

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
// io.use(
//   socketioJwt.authorize({
//     secret: process.env.JWT_SECRECT_KEY,
//     handshake: true,
//     timeout: 15000,
//     //auth_header_required: true,
//   })
// );

server.listen(PORT, () => {
  console.log("server is running on " + PORT);
});

// Login API endpoint
app.post("/join", (req, res) => {
  const { name, email, meetingId } = req.body;

  if (name && email && meetingId) {
    console.log(name, email, meetingId);

    let user = {
      iss: "localhost",
      iat: Date.now(),
      aud: "localhost",
      sub: email,
      name: name,
      email: email,
      role: "User",
      meeting_id: meetingId,
    };

    insertUser(user.name, user.email, (err, insertedId) => {
      if (err) {
        console.error(err);
      } else {
        console.log("insertedId = " + insertedId);
        user.user_id = insertedId;
        const token = jwt.sign(user, process.env.JWT_SECRECT_KEY, {
          expiresIn: "1h",
        });
        res.status(200).json({
          type: "created",
          status: "success",
          data: { id: insertedId, token: token },
        });
      }
    });
    //res.status(200).json({ name });
  } else {
    res.status(200).json({
      type: "failed",
      status: "error",
    });
  }
});

// // Path to the SQLite database file
const dbPath = path.resolve(__dirname, "db.sqlite");

console.warn(dbPath);

// Create a new SQLite database instance
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// Create a table
db.serialize(() => {
  // Create table if not exists
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT)`);

  db.run(`CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    created_user_id TEXT,
    status TEXT)`);

  db.run(`CREATE TABLE IF NOT EXISTS meetings_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    socket_id TEXT,
    initiator TEXT,
    status TEXT)`);
});

const insertUser = (name, email, callback) => {
  let id = "U-" + uuidv4();
  db.run(
    `INSERT INTO users (id, name, email) VALUES (?, ?, ?)`,
    [id, name, email],
    function (err) {
      if (err) {
        return console.error(err.message);
      }
      console.log(`A row has been inserted into users with rowid ${id}`);
      if (callback) {
        callback(null, id);
      }
    }
  );
};

// Insert into meetings table
const insertMeeting = (id, created_user_id, status, callback) => {
  db.run(
    `INSERT INTO meetings (id, created_user_id, status) VALUES (?, ?, ?)`,
    [id, created_user_id, status],
    function (err) {
      if (err) {
        return console.error(err.message);
      }
      console.log(`A row has been inserted into meetings with rowid ${id}`);
      if (callback) {
        callback(id);
      }
    }
  );
};

// Insert into meetings_sessions table
const insertMeetingSession = (
  user_id,
  socket_id,
  initiator,
  status,
  callback
) => {
  let id = "S-" + uuidv4();
  db.run(
    `INSERT INTO meetings_sessions (id, user_id, socket_id, initiator, status) VALUES (?, ?, ?, ?, ?)`,
    [id, user_id, socket_id, initiator, status],
    function (err) {
      if (err) {
        return console.error(err.message);
      }
      console.log(
        `A row has been inserted into meetings_sessions with rowid ${id}`
      );
      if (callback) {
        callback(id);
      }
    }
  );
};

const dropUsersTable = () => {
  db.run(`DROP TABLE IF EXISTS users`, function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Users table dropped successfully`);
  });
};

// Function to drop the meetings table
const dropMeetingsTable = () => {
  db.run(`DROP TABLE IF EXISTS meetings`, function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Meetings table dropped successfully`);
  });
};

// Function to drop the meetings_sessions table
const dropMeetingsSessionsTable = () => {
  db.run(`DROP TABLE IF EXISTS meetings_sessions`, function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Meetings_sessions table dropped successfully`);
  });
};

// Close the database connection when the Node.js process exits
process.on("exit", () => {
  dropUsersTable();
  dropMeetingsTable();
  dropMeetingsSessionsTable();
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Close the database connection.");
  });
});

const activeUsers = {};

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  //console.log("token = " + token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRECT_KEY);
    socket.decoded = decoded;
    next();
  } catch (err) {
    // err
    next(new Error("unable to decode jwt token"));
  }
});

io.on("connection", (socket) => {
  console.log("A user connected " + socket.id);

  // setInterval(() => {
  //   socket.broadcast.emit("user-connected", "uid");
  // }, 10000);

  let user = socket.decoded;
  delete user.iss;
  delete user.iat;
  delete user.aud;
  delete user.sub;
  delete user.exp;

  if (user) {
    console.log(JSON.stringify(socket.decoded));
    const meetingId = socket.decoded.meeting_id;
    console.log("meetingId = ", meetingId);
    user.socket_id = socket.id;
    activeUsers[meetingId] = [user];

    //socket.broadcast.emit("user-connected", userId);
    //io.emit("peers", Object.keys(activeUsers));
    console.log("activeUsers = " + JSON.stringify(activeUsers));

    try {
      socket.join(meetingId);
      socket.to(meetingId).emit("join", activeUsers);
    } catch (error) {
      console.error(error);
    }
  }

  socket.on("connect", () => {
    console.log("🔥: connet");
  });

  // socket.on("join-room", (userId) => {
  //   activeUsers[userId] = socket.id;
  //   socket.broadcast.emit("user-connected", userId);
  //   io.emit("peer-list", Object.keys(activeUsers));
  // });

  socket.on("connec_error", () => {
    console.log("🔥: A user disconnected");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    const userId = Object.keys(activeUsers).find(
      (key) => activeUsers[key] === socket.id
    );
    if (userId) {
      delete activeUsers[userId];
      io.emit("user-disconnected", userId);
      io.emit("peer-list", Object.keys(activeUsers));
    }
  });

  socket.on("offer", (data) => {
    const { target, offer } = data;
    io.to(activeUsers[target]).emit("offer", { caller: socket.id, offer });
  });

  socket.on("answer", (data) => {
    const { target, answer } = data;
    io.to(activeUsers[target]).emit("answer", { caller: socket.id, answer });
  });

  socket.on("ice-candidate", (data) => {
    const { target, candidate } = data;
    io.to(activeUsers[target]).emit("ice-candidate", {
      caller: socket.id,
      candidate,
    });
  });

  socket.on("signal", (data) => {
    const { target, signal } = data;
    io.to(activeUsers[target]).emit("signal", { caller: socket.id, signal });
  });

  // socket.on("message", (data) => {
  //   const { target, message } = data;
  //   console.log(message);
  //   io.to(activeUsers[target]).emit("message", { sender: socket.id, message });
  // });

  socket.on("message", (data) => {
    console.log("🔥: message = " + JSON.stringify(data));
    const { target, message } = data;
    //io.emit("message", "world");
    socket.emit("message", message);
  });
});
