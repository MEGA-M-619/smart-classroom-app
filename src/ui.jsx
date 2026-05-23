export function Modal({ title, onClose, children }) {
  return (
    <div className="sca-modal-bg" onClick={onClose}>
      <div className="sca-modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontWeight: 600, fontSize: 18 }}>{title}</h3>
          <button type="button" className="sca-btn sca-btn-ghost" style={{ padding: "6px 10px" }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
