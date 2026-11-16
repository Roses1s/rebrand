/** Точка входа: монтирует макет в #root и подключает стили. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { applyPrefs } from "./lib/prefs";
import "./styles/index.css";

// Тема, акцент и плотность из прошлого визита — до первого рендера.
applyPrefs();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
