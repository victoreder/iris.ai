import { Routes, Route } from "react-router-dom";
import { LeadRedirect } from "./pages/LeadRedirect";

export default function App() {
  return (
    <Routes>
      <Route path="/l/:slug" element={<LeadRedirect />} />
      <Route
        path="/"
        element={
          <div style={{ padding: 24, fontFamily: "system-ui", textAlign: "center" }}>
            Informe o link completo, ex.: /l/sua-campanha
          </div>
        }
      />
      <Route path="*" element={<div style={{ padding: 24 }}>Link não encontrado.</div>} />
    </Routes>
  );
}
