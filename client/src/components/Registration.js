import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useHistory hook
import { nanoid } from "nanoid";
import "../css/registrationForm.css"; // Import the CSS file

const Registration = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [meetingId, setMeetingId] = useState(nanoid());
  const [errorMessage, setErrorMessage] = useState("");

  let navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5001/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, meetingId }),
      });

      const data = await response.json();

      console.log(JSON.stringify(data));

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      if (data.type === "created" && data.status === "success") {
        // Registration successful, you can redirect or do something else
        console.log("Registration successful");
        navigate(`/meeting/${data.data.token}`);
      }
    } catch (error) {
      setErrorMessage("Registration failed. Please try again.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      setName(value);
    } else if (name === "email") {
      setEmail(value);
    } else if (name === "meeting_id") {
      setMeetingId(value);
    }
  };

  const handleCopyMeetingId = () => {
    navigator.clipboard
      .writeText(meetingId)
      .then(() => console.log("Meeting ID copied to clipboard"))
      .catch((err) => console.error("Failed to copy Meeting ID:", err));
  };

  return (
    <div className="join-meeting-container">
      <h2>Join Meeting</h2>
      <form onSubmit={handleRegister}>
        <div>
          <label htmlFor="username">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="meeting_id">Meeting ID:</label>
          <div className="meeting-id-input-container">
            <input
              type="text"
              id="meeting_id"
              name="meeting_id"
              value={meetingId}
              onChange={handleInputChange}
              required
            />
            <button type="button" onClick={handleCopyMeetingId}>
              Copy
            </button>
          </div>
        </div>
        <button type="submit">Join</button>
        {errorMessage && <p>{errorMessage}</p>}
      </form>
    </div>
  );
};

export default Registration;
