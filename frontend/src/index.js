import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { initAdminAuth } from "@/lib/adminAuth";

// Restaure la session admin (Supabase + secret legacy) et garde l'en-tete a jour.
initAdminAuth();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
