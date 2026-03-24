import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { QueryProvider } from "./providers/query-provider";
import { ThemeProvider } from "./providers/theme-provider";
import "./styles/tailwind.css";

createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <App />
    </ThemeProvider>
  </QueryProvider>
);