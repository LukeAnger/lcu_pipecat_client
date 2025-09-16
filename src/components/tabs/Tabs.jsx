import "./Tabs.css";

const Tabs = ({ tabs, active, onChange }) => {
  return (
    <div className="tabs" role="tablist" aria-label="Activity sections">
      {tabs.map((t) => {
        const selected = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${t.key}`}
            id={`tab-${t.key}`}
            className={`tab ${selected ? "tab--active" : ""}`}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => {
              const idx = tabs.findIndex((x) => x.key === active);
              if (e.key === "ArrowRight") onChange(tabs[(idx + 1) % tabs.length].key);
              if (e.key === "ArrowLeft") onChange(tabs[(idx - 1 + tabs.length) % tabs.length].key);
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;