export function PageShell({ title, subtitle, actions, children }) {
  return (
    <div className="sca-page fade-in">
      <header className={`sca-page-header${actions ? ' sca-page-header--row' : ''}`}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="sca-page-header__actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
