import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Survey from './Survey';
import Report from './Report';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Survey />} />
        <Route path="/report" element={<Report />} />
      </Routes>
    </Router>
  );
}

export default App;