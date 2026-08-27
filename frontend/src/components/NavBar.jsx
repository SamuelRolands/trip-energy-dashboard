import { NavLink } from "react-router-dom";
import Logo from "./Logo";

const LINKS = [
  { to: "/", label: "Overview", end: true },
  { to: "/predict", label: "Predictor" },
  { to: "/performance", label: "Model Performance" },
  { to: "/insights", label: "Feature Insights" },
  { to: "/trips", label: "Sample Trips" },
  { to: "/about", label: "About" },
];

export default function NavBar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <Logo size={32} />
          <div>
            <div className="navbar-title">GRADIA</div>
            <div className="navbar-subtitle">Predict the Mile Ahead</div>
          </div>
        </div>
        <nav className="navbar-links">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => "navbar-link" + (isActive ? " active" : "")}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(11, 14, 20, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-soft);
        }
        .navbar-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .navbar-title {
          font-weight: 800;
          font-size: 15.5px;
          letter-spacing: 0.02em;
        }
        .navbar-subtitle {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          letter-spacing: 0.04em;
        }
        .navbar-links {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .navbar-link {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .navbar-link:hover {
          color: var(--text-primary);
          background: var(--bg-2);
        }
        .navbar-link.active {
          color: var(--blue);
          background: rgba(57,135,229,0.12);
        }
        @media (max-width: 900px) {
          .navbar-inner { flex-direction: column; align-items: flex-start; padding: 14px 18px; }
        }
      `}</style>
    </header>
  );
}
