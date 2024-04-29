import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import socketIO from "socket.io-client";
import SimplePeer from "simple-peer";

const Meeting = () => {
  const { token } = useParams();
  const [peers, setPeers] = useState([]);
  const [meetingId, setMeetingId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  const localVideoRef = useRef();
  const peerRefs = useRef({});

  const socketRef = useRef(null);
  const peerRef = useRef(null);

  const handleMessageSend = () => {
    if (messageText.trim() !== "") {
      console.log(JSON.stringify(peers));

      // socket.emit("message", { target: peers[0].id, message: messageText });
      // setMessages((prevMessages) => [
      //   ...prevMessages,
      //   { sender: "You", message: messageText },
      // ]);
      // setMessageText("");
    }
  };

  // const createPeer = useCallback(
  //   (userId, callerId) => {
  //     const peer = new SimplePeer({
  //       initiator: callerId === socketRef.current.id,
  //       trickle: false,
  //       stream: localStream,
  //     });

  //     peer.on("signal", (signal) => {
  //       socketRef.current.emit("signal", { target: userId, signal });
  //     });

  //     peer.on("stream", (stream) => {
  //       console.log("Received stream from peer:", userId);
  //       // Handle the received stream (optional)
  //     });

  //     peer.on("connect", () => {
  //       console.log("Peer connected:", userId);
  //     });

  //     peer.on("close", () => {
  //       console.log("Peer closed:", userId);
  //     });

  //     peer.on("error", (error) => {
  //       console.error("Peer error:", error);
  //     });

  //     return peer;
  //   },
  //   [localStream]
  // );

  useEffect(() => {
    console.log("Meeting Compponent loaded");
    socketRef.current = socketIO.connect("http://localhost:5001", {
      auth: {
        token: token,
      },
      reconnection: true, // Enable reconnection
      reconnectionAttempts: 5, // Number of reconnection attempts
      reconnectionDelay: 1000, // Delay between each reconnection attempt (in milliseconds)
      reconnectionDelayMax: 5000, // Maximum delay between reconnection attempts
      randomizationFactor: 0.5, // Randomization factor to vary the reconnection delay
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to server");
    });

    socketRef.current.on("connection", () => {
      console.log("client connected");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected");
      console.log("Socket disconnected. Attempting to reconnect...");
      socketRef.current.connect();
    });

    socketRef.current.on("join", (peers) => {
      console.log("client:join = " + JSON.stringify(peers));
      // const keys = Object.keys(peers);
      // console.log("keys = " + JSON.stringify(keys));
      // if (keys[0]) {
      //   setMeetingId(keys[0]);
      // }

      // let users = peers[keys[0]];
      // console.log(JSON.stringify(users));
      // setPeers(users.map((user) => createPeer(user.user_id, user.socket_id)));

      // const { sender, message } = data;
      // console.log("Meeting:messsage called");
      // setMessages((prevMessages) => [...prevMessages, { sender, message }]);
    });

    socketRef.current.on("message", (data) => {
      console.log("client:message = " + data);
      // const { sender, message } = data;
      // console.log("Meeting:messsage called");
      // setMessages((prevMessages) => [...prevMessages, { sender, message }]);
    });

    socketRef.current.on("unauthorized", (error) => {
      if (
        error.data.type === "UnauthorizedError" ||
        error.data.code === "invalid_token"
      ) {
        // redirect user to login page perhaps?
        console.log("User token has expired");
      }
    });

    socketRef.current.on("user-connected", (userId) => {
      console.log("User connected:", userId);
      // const peer = createPeer(userId, socket.id);
      // peerRefs.current[userId] = peer;
      // setPeers((prevPeers) => [...prevPeers, peer]);
    });

    socketRef.current.on("user-disconnected", (userId) => {
      console.log("User disconnected:", userId);
      // const peer = peerRefs.current[userId];
      // if (peer) {
      //   peer.destroy();
      //   delete peerRefs.current[userId];
      //   setPeers((prevPeers) => prevPeers.filter((p) => p !== peer));
      // }
    });

    // socketRef.current.on("peer-list", (activePeers) => {
    //   console.log("peer-list:", activePeers);

    //   //setPeers(activePeers.map((userId) => createPeer(userId, socket.id)));
    //   // const newPeers = activePeers.filter(
    //   //   (userId) => !peers.some((peer) => peer._id === userId)
    //   // );
    //   // setPeers((prevPeers) => [
    //   //   ...prevPeers,
    //   //   ...newPeers.map((userId) => createPeer(userId, socket.id)),
    //   // ]);
    // });

    socketRef.current.on("signal", (data) => {
      const { caller, signal } = data;
      const peer = peerRefs.current[caller];
      if (peer) {
        peer.signal(signal);
      }
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        //setLocalStream(stream);
        localVideoRef.current.srcObject = stream;
        //socketRef.current.emit("join-room", socketRef.current.id);
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
      });

    setInterval(() => {
      socketRef.current.emit("message", {
        target: socketRef.current.id,
        message: "hi",
      });
      console.log("sent");
    }, 5000);

    return () => {
      socketRef.current.disconnect();
    };
  }, [token]);

  return (
    <div className="App">
      <h1>Simple Peer WebRTC Example</h1>
      <div className="video-container">
        <div className="local-video">
          <video ref={localVideoRef} autoPlay muted playsInline />
        </div>
        <div className="remote-videos">
          {peers.map((peer, index) => (
            <video
              key={index}
              ref={(ref) => (peerRefs.current[peer._id] = ref)}
              autoPlay
              playsInline
            />
          ))}
        </div>
      </div>
      <div className="chat-container">
        <h2>Chat</h2>
        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={msg.sender === "You" ? "message you" : "message"}
            >
              <span className="sender">{msg.sender}:</span> {msg.message}
            </div>
          ))}
        </div>
        <div className="message-input">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <button onClick={handleMessageSend}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default Meeting;
