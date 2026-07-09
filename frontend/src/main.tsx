import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";

import App from "./App";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-center"
        richColors
        toastOptions={{ style: { fontFamily: "Nunito, sans-serif", borderRadius: "16px" } }}
      />
    </QueryClientProvider>
  </StrictMode>,
);
