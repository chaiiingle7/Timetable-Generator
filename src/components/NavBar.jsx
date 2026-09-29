import React from "react"; import { Calendar, LogIn, LogOut } from "lucide-react";
export default NavBar

function NavBar({ page, setPage, authed, onLogout, hasResult }) {
  const tabs = [
    { key: "about", label: "About" },
    { key: "input", label: "Set Up" },
    { key: "result", label: "Timetables", disabled: !hasResult },
    { key: "help", label: "Help" },
  ];
  return (
    <div className="tg-nav">
      <div className="tg-nav-inner">
        <div className="tg-brand" onClick={() => setPage(authed ? "about" : "login")}>
          <Calendar size={18} strokeWidth={2.2} />
          Periodic
        </div>
        <div className="tg-tabs">
          {authed && tabs.map((t) => (
            <button
              key={t.key}
              className={`tg-tab ${page === t.key ? "active" : ""}`}
              disabled={t.disabled}
              onClick={() => setPage(t.key)}
              title={t.disabled ? "Generate a timetable first" : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
        {authed ? (
          <button className="tg-navbtn" onClick={onLogout}><LogOut size={14} /> Sign Out</button>
        ) : (
          <button className="tg-navbtn" onClick={() => setPage("login")}><LogIn size={14} /> Sign In</button>
        )}
      </div>
    </div>
  );
}
