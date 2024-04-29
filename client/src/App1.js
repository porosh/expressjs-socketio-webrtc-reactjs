import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Registration from "./components/Registration";
import Meeting from "./components/Meeting";
import Client from "./components/Client";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" exact element={<Registration />} />
        <Route path="/meeting/:token" element={<Meeting />} />
      </Routes>
    </Router>
  );
};

export default App;
