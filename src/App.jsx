import { use, useEffect, useMemo, useRef, useState } from 'react';
import { usePipecatClient } from './hooks/usePipecatClient';

import Header from './components/header/Header';
import Setup from './components/setup/Setup';
import Home from './components/home/Home';            // acts as Preview
import Analytics from './components/analytics/Analytics';
import Tabs from './components/tabs/Tabs';

import { useBootstrapActivity } from './hooks/useBootstrapActivity';

function getTabFromURL() {
  const p = new URLSearchParams(window.location.search);
  const t = p.get('tab');
  return t === 'setup' || t === 'preview' || t === 'analytics' ? t : 'setup';
}

function setTabInURL(tab) {
  const u = new URL(window.location.href);
  u.searchParams.set('tab', tab);
  window.history.replaceState({}, '', u);
}

export default function App() {
  const audioRef = useRef(null);

  const {
    status, transportState, logs,
    userTranscript, botTranscript, searchBlock,
    activityBlock,
    connect, disconnect
  } = usePipecatClient(audioRef);

  const [unmuted, setUnmuted] = useState(false);

  // Bootstrap activity data on load (if any)
  useBootstrapActivity("a5cb8d4b-5776-4947-b93d-b766533458e5", "None");

  // Tabs state
  const [tab, setTab] = useState(getTabFromURL());
  useEffect(() => {
    const onPop = () => setTab(getTabFromURL());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => { setTabInURL(tab); }, [tab]);

  const tabs = useMemo(() => ([
    { key: 'setup', label: 'Setup' },
    { key: 'preview', label: 'Preview' },
    { key: 'analytics', label: 'Analytics' },
  ]), []);

  return (
    <div className="container">
      <Header />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <section
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="tab-panel"
      >
        {tab === 'setup' && (
          <Setup />
        )}

        {tab === 'preview' && (
          <Home
            status={status}
            transportState={transportState}
            logs={logs}
            userTranscript={userTranscript}
            botTranscript={botTranscript}
            searchBlock={searchBlock}
            activityBlock={activityBlock}
            connect={connect}
            disconnect={disconnect}
            audioRef={audioRef}
            unmuted={unmuted}
            setUnmuted={setUnmuted}
          />
        )}

        {tab === 'analytics' && <Analytics />}
      </section>

      {/* <div className="debug-panel">
        <h3>Debug Info</h3>
        <div id="debug-log">
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div> */}
    </div>
  );
}
