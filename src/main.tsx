import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { getApiBaseUrl } from "@/api/config";
import { USE_MOCK } from "@/api/useMock";

// E2E tripwire: suites assert the app really started in the mode they expect
// (Vite bakes env at process start — a stale dev server silently lies).
document.documentElement.dataset.apiMode = USE_MOCK ? "mock" : "http";

// Log API configuration at startup (development only)
if (import.meta.env.DEV) {
  console.log("🚀 Frontend Starting...");
  if (USE_MOCK) {
    console.log("🧪 MOCK API ENABLED: in-memory store (alice / password123)");
  } else {
    console.log("✅ API origin:", getApiBaseUrl());
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
