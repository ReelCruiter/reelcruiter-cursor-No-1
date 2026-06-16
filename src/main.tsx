import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Eagerly initialise the global auth cache so the first render of any
// component that needs the current user has it available without an
// extra network round-trip.
import "./lib/authCache";

createRoot(document.getElementById("root")!).render(<App />);
