import "./installPrompt";
// Fonts served from this site rather than Google Fonts, so the first paint doesn't wait on a
// connection to another server. Inter 400 and 500 match the weights the app has always loaded.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/space-grotesk/700.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import Root from "./Root";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>
);

