// App.js

import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  //const pc = new RTCPeerConnection();

  useEffect(() => {
    if (localStream) {
      // Add local stream to peer connection
      localStream.getTracks().forEach((track) => {
        pcRef.current.addTrack(track, localStream);
      });

      // Initiate negotiation
      pcRef.current.onnegotiationneeded = async () => {
        try {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);

          // Send offer to server
          socketRef.current.emit("offer", offer);
        } catch (error) {
          console.error("Error creating offer:", error);
        }
      };
    }
  }, [localStream]);

  useEffect(() => {
    socketRef.current = io("http://localhost:5001");
    pcRef.current = new RTCPeerConnection();
    // Get local stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        localVideoRef.current.srcObject = stream;

        // Add local stream to peer connection
        // stream.getTracks().forEach((track) => {
        //   pcRef.current.addTrack(track, stream);
        // });
      })
      .catch((error) => console.error("Error accessing media devices:", error));

    // Set up event listeners for peer connection
    pcRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(event);
        // Send ICE candidate to server
        socketRef.current.emit("icecandidate", event.candidate);
      }
    };

    // Listen for offer from server
    socketRef.current.on("offer", async (data) => {
      try {
        if (pcRef.current.signalingState !== "closed") {
          const offer = new RTCSessionDescription(data);
          if (pcRef.current.signalingState !== "stable") {
            await Promise.all([
              pcRef.current.setLocalDescription({ type: "rollback" }),
              pcRef.current.setRemoteDescription(offer),
            ]);
          } else {
            await pcRef.current.setRemoteDescription(offer);
          }
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);

          // Send answer to server
          socketRef.current.emit("answer", answer);
        }
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    });

    // Listen for answer from server
    socketRef.current.on("answer", async (data) => {
      try {
        if (pcRef.current.signalingState !== "closed") {
          const answer = new RTCSessionDescription(data);
          await pcRef.current.setRemoteDescription(answer);
        }
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    });

    // Listen for ICE candidates from server
    socketRef.current.on("icecandidate", async (data) => {
      try {
        if (pcRef.current.signalingState !== "closed") {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    return () => {
      // Clean up
      pcRef.current.close();
      socketRef.current.disconnect();
    };
  }, []);

  const handleOffer = async () => {
    try {
      if (pcRef.current.signalingState === "stable") {
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);

        // Send offer to server
        socketRef.current.emit("offer", offer);
      }
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  return (
    <div>
      <h1>WebRTC Example</h1>
      <div>
        <h2>Local Video</h2>
        <video ref={localVideoRef} autoPlay playsInline muted />
      </div>
      <div>
        <h2>Remote Video</h2>
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>
      <button onClick={handleOffer}>Offer</button>
    </div>
  );
}

export default App;
