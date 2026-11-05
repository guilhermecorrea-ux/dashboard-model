import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "../../design-system/components/bundle.css";
import "./styles/app.css";
import App from "./App";

try {
  const t = localStorage.getItem("bmb.tema");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch { /* sem armazenamento */ }

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
