import React, { useState } from "react";
import NavBar from "./components/NavBar";
import LoginPage from "./pages/LoginPage";
import AboutPage from "./pages/AboutPage";
import InputPage from "./pages/InputPage";
import ResultPage from "./pages/ResultPage";
import HelpPage from "./pages/HelpPage";
import { emptyConfig, buildSampleConfig } from "./lib";
import { generateTimetable, saveConfig } from "./api";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("about");
  const [config, setConfig] = useState(emptyConfig);
  const [schedule, setSchedule] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError("");
    try {
      const result = await generateTimetable(config);
      if (result.error) {
        setGenError(result.error);
        setSchedule(null);
      } else {
        setSchedule(result);
        saveConfig(config).catch(() => {}); // best-effort save to Supabase
        setPage("result");
      }
    } catch (e) {
      setGenError("Could not reach the server. Is the Python backend running?");
    }
    setGenerating(false);
  };

  return (
    <div className="tg-root">
      <NavBar
        page={page}
        setPage={setPage}
        authed={authed}
        onLogout={() => { setAuthed(false); setPage("about"); }}
        hasResult={!!schedule}
      />
      {!authed && page !== "login" && <AboutPage goInput={() => setPage("login")} />}
      {!authed && page === "login" && (
        <LoginPage onLogin={() => { setAuthed(true); setPage("about"); }} goAbout={() => setPage("about")} />
      )}
      {authed && page === "about" && <AboutPage goInput={() => setPage("input")} />}
      {authed && page === "input" && (
        <InputPage
          config={config}
          setConfig={setConfig}
          onGenerate={handleGenerate}
          generating={generating}
          genError={genError}
          onLoadSample={() => setConfig(buildSampleConfig())}
        />
      )}
      {authed && page === "result" && (
        <ResultPage config={config} schedule={schedule} setPage={setPage} />
      )}
      {authed && page === "help" && <HelpPage />}
    </div>
  );
}
