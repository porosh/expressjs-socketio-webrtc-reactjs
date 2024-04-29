import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import socketIO from "socket.io-client";
import SimplePeer from "simple-peer";

const Meeting = () => {
  const { token } = useParams();
  //const [peers, setPeers] = useState([]);

  const localVideoRef = useRef();
  const peerRefs = useRef({});

  const socketRef = useRef(null);
  const peerRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState({});
  const userVideoRef = useRef();
  const peersRef = useRef({});

  const callUser = (userId, stream) => {
    const peer = new RTCPeerConnection();
    peer.ontrack = handleTrackEvent;
    peer.addStream(stream);

    peer
      .createOffer()
      .then((offer) => {
        peer.setLocalDescription(offer);
        socketRef.current.emit("call-user", {
          to: userId,
          from: socketRef.current.id,
          signal: offer,
        });
      })
      .catch((err) => console.error("Error creating offer:", err));

    // Add peer to the list
    setPeers((prevPeers) => ({
      ...prevPeers,
      [userId]: peer,
    }));

    peersRef.current[userId] = peer;
  };

  const handleTrackEvent = (e) => {
    // Create a new video element for each track
    const video = document.createElement("video");
    video.srcObject = e.streams[0];
    video.autoplay = true;
    video.className = "remote-video";
    document.getElementById("remote-videos").appendChild(video);
  };

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

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }

        // Listen for incoming calls
        socketRef.current.on("call-user", ({ from, signal }) => {
          // Answer the call
          const peer = new RTCPeerConnection();
          peer.ontrack = handleTrackEvent;
          peer.signal(signal);

          // Add peer to the list
          setPeers((prevPeers) => ({
            ...prevPeers,
            [from]: peer,
          }));

          peersRef.current[from] = peer;
        });

        // When a new user joins, call that user
        socketRef.current.on("user-connected", (userId) => {
          callUser(userId, stream);
        });
      })
      .catch((err) => console.error("Error accessing media devices:", err));

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [token]);

  return (
    <div className="video-chat">
      <div className="local-video">
        <video ref={userVideoRef} muted autoPlay></video>
      </div>
      <div id="remote-videos"></div>
    </div>
  );
};

export default Meeting;
