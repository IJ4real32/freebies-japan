// ✅ FILE: src/index.js
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// ✅ Root element
const root = ReactDOM.createRoot(document.getElementById("root"));

// ✅ Lightweight fallback while routes/pages lazy-load
const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-100 text-gray-600 text-center px-6">
    <img
      src="/logo192.png"
      alt="Freebies Japan"
      className="w-20 h-20 mb-4 animate-pulse"
    />
    <h2 className="text-lg font-semibold mb-1">Loading Freebies Japan...</h2>
    <p className="text-sm text-gray-500">
      Please wait a moment — optimizing for mobile.
    </p>
  </div>
);

// ✅ Render with Suspense (smooth on phones & tablets)
root.render(
  <React.StrictMode>
    <Suspense fallback={<LoadingScreen />}>
      <App />
    </Suspense>
  </React.StrictMode>
);

// ✅ Optional: measure performance
reportWebVitals((metric) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[WebVitals] ${metric.name}:`, Math.round(metric.value));
  }
});
