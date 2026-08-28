export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>GRADIA</span>
        <span className="site-footer-dot">·</span>
        <span>Created by Samuel Rolands</span>
      </div>

      <style>{`
        .site-footer {
          border-top: 1px solid var(--border-soft);
          margin-top: 24px;
        }
        .site-footer-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 32px;
          font-size: 12.5px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .site-footer-dot { opacity: 0.6; }
        @media (max-width: 640px) {
          .site-footer-inner { padding: 18px 18px; }
        }
      `}</style>
    </footer>
  );
}
