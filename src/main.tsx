import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installEmbeddedScroll } from "./embeddedScroll";
import "./styles.css";
const root = document.getElementById("root")!;
const removeEmbeddedScroll = installEmbeddedScroll(root);
import.meta.hot?.dispose(removeEmbeddedScroll);
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
