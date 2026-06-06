import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { api, onTwitchAuth, TwitchAuth } from './twitch';

type Passport = {
  season: { name: string };
  settings: any;
  count: number;
  stamps: any[];
  rewards: any[];
};

function App() {
  const [auth, setAuth] = useState<TwitchAuth>();
  const [data, setData] = useState<Passport>();
  const [error, setError] = useState('');

  async function load(a = auth) {
    if (!a) return;
    try {
      setData(await api('/api/passport', a));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function checkin() {
    if (!auth) return;
    await api('/api/checkin', auth, { method: 'POST' });
    await load(auth);
  }

  useEffect(() => onTwitchAuth(async a => {
    setAuth(a);
    await load(a);
  }), []);

  const theme = data?.settings || {};

  return (
    <div className="wrap" style={{ color: theme.textColor }}>
      <main className="passport" style={{ borderColor: theme.borderColor }}>
        <section className="cover" style={{ background: theme.coverColor }}>
          <h1>PASSEPORT LIVE</h1>
          <div>{data?.season.name || 'Chargement...'}</div>
        </section>

        <section className="page" style={{ background: theme.pageColor, color: theme.textColor }}>
          {error && <p>{error}</p>}

          <div className="row">
            <button className="btn" style={{ background: theme.buttonColor }} onClick={checkin}>
              Tamponner ma visite du jour
            </button>
            <strong>{data?.count || 0} tampons</strong>
          </div>

          <h2>Mes tampons</h2>

          <div className="grid">
            {data?.stamps.length ? data.stamps.map(s =>
              <div className="stamp" key={s.id} style={{ borderColor: theme.borderColor }}>
                <img
                  src={s.imageUrl?.startsWith('/stamps/') ? `.${s.imageUrl}` : s.imageUrl}
                  alt={s.title}
                />
                <b>{s.title}</b>
                <small>{new Date(s.earnedAt).toLocaleDateString()}</small>
              </div>
            ) : <p>Aucun tampon pour le moment.</p>}
          </div>

          <h2>Récompenses</h2>

          <div className="rewards">
            {data?.rewards.map(r =>
              <div className={`reward ${r.unlocked ? 'unlocked' : ''}`} key={r.id}>
                <b>{r.unlocked ? '✅' : '🔒'} {r.title}</b>
                <p>{r.description}</p>
                <small>{r.requiredStamps} tampons requis</small>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);