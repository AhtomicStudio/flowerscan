import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted fonts (no font CDN: it would send the user's IP to a third party, docs/09).
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/inter/wght.css";
import { App } from "./app/App";
import "./styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
