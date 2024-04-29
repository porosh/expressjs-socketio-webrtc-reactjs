import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const Client = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const socket = io.connect("http://localhost:5001", {
    //transports: ["websocket", "polling"],
    auth: {
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    },
    reconnection: true, // Enable reconnection
    reconnectionAttempts: 5, // Number of reconnection attempts
    reconnectionDelay: 1000, // Delay between each reconnection attempt (in milliseconds)
    reconnectionDelayMax: 5000, // Maximum delay between reconnection attempts
    randomizationFactor: 0.5, // Randomization factor to vary the reconnection delay
  });

  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
    console.log("Socket disconnected. Attempting to reconnect...");
    socket.connect();
  });

  socket.on("connection", (socket) => {
    console.log("client connected");

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  });

  socket.on("message", (data) => {
    console.log("Received event:", data);
  });

  useEffect(() => {
    setInterval(() => {
      socket.emit("message", "dd");
      console.log("sent");
    }, 5000);

    return () => {
      //socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>Socket.IO Chat</h1>
      <div>
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.username}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={() => {}}>Send</button>
    </div>
  );
};

export default Client;
