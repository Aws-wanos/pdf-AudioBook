import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Set the worker for pdfjs-dist

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
