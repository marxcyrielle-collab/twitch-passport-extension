import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { api, onTwitchAuth, TwitchAuth } from './twitch';

function Broadcaster() {
  const [auth, setAuth] = useState<TwitchAuth>();
  const [data, setData] = useState<any>();
  const [season, setSeason] = useState('Saison 1');
  const [theme, setTheme] = useState({
    coverColor: '#4b145f',
    pageColor: '#f7e4b5',
    textColor: '#1b0b00',
    buttonColor: '#6b1b75',
    borderColor: '#a06a2c'
  });

  const [stamp, setStamp] = useState({
    title: 'Tampon spécial',
    imageUrl: '/stamps/custom.svg',
    kind: 'custom',
    activate: true
  });

  const [reward, setReward] = useState({
    title: 'VIP du passeport',
    description: 'Récompense à donner manuellement ou via Discord.',
    requiredStamps: 10
  });

  async function load(a = auth) {
    if (!a) return;
    const d = await api('/api/admin', a);
    setData(d);
    if (d.settings) setTheme({
      coverColor: d.settings.coverColor,
      pageColor: d.settings.pageColor,
      textColor: d.settings.textColor,
      buttonColor: d.settings.buttonColor,
      borderColor: d.settings.borderColor
    });
  }

  useEffect(() => onTwitchAuth(async a => { setAuth(a); await load(a); }), []);

  async function post(path: string, body: any) {
    if (!auth) return;
    await api(path, auth, { method: 'POST', body: JSON.stringify(body) });
    await load(auth);
  }
async function createChristmasCollection() {
  if (!auth) return;

  for (let i = 1; i <= 16; i++) {
    await api('/api/admin/stamps', auth, {
      method: 'POST',
      body: JSON.stringify({
        title: `Noël ${i}`,
        imageUrl: `/stamps/christmas/daily-christmas-${i}.png`,
        kind: 'event',
        activate: false
      })
    });
  }

  await load(auth);
}
  return (
    <div className="wrap" style={{ color: theme.textColor }}>
      <main className="passport" style={{ borderColor: theme.borderColor }}>
        <section className="cover" style={{ background: theme.coverColor }}>
          <h1>ADMIN PASSEPORT</h1>
          <div>{data?.season?.name}</div>
        </section>

        <section className="page" style={{ background: theme.pageColor, color: theme.textColor }}>

          {/* Couleurs */}
          <h2>Couleurs du passeport</h2>
          <div className="form">
            <label>Couverture</label>
            <input type="color" value={theme.coverColor} onChange={e => setTheme({ ...theme, coverColor: e.target.value })} />
            <label>Page</label>
            <input type="color" value={theme.pageColor} onChange={e => setTheme({ ...theme, pageColor: e.target.value })} />
            <label>Texte</label>
            <input type="color" value={theme.textColor} onChange={e => setTheme({ ...theme, textColor: e.target.value })} />
            <label>Bouton</label>
            <input type="color" value={theme.buttonColor} onChange={e => setTheme({ ...theme, buttonColor: e.target.value })} />
            <label>Bordure tampon</label>
            <input type="color" value={theme.borderColor} onChange={e => setTheme({ ...theme, borderColor: e.target.value })} />
            <button className="btn" style={{ background: theme.buttonColor }} onClick={() => post('/api/admin/settings', theme)}>
              Enregistrer les couleurs
            </button>
          </div>

          {/* Saison */}
          <h2>Saison</h2>
          <div className="form">
            <label>Nom saison</label>
            <input value={season} onChange={e => setSeason(e.target.value)} />
            <button className="btn" style={{ background: theme.buttonColor }} onClick={() => post('/api/admin/season', { name: season })}>
              Créer/activer saison
            </button>
          </div>
<h2>Collection Noël</h2>
<div className="form">
  <button className="btn" style={{background:theme.buttonColor}} onClick={createChristmasCollection}>
    Créer les 16 tampons Noël
  </button>
</div>
          {/* Tampon custom */}
          <h2>Tampon custom</h2>
          <div className="form">
            <input placeholder="Titre" value={stamp.title} onChange={e => setStamp({ ...stamp, title: e.target.value })} />
            <input placeholder="URL image SVG/PNG" value={stamp.imageUrl} onChange={e => setStamp({ ...stamp, imageUrl: e.target.value })} />
            <select value={stamp.kind} onChange={e => setStamp({ ...stamp, kind: e.target.value })}>
              <option value="custom">Custom</option>
              <option value="daily">Quotidien</option>
              <option value="event">Événement</option>
            </select>
            <label>
              <input type="checkbox" checked={stamp.activate} onChange={e => setStamp({ ...stamp, activate: e.target.checked })} />
              Actif pour le live du jour
            </label>
            <button className="btn" style={{ background: theme.buttonColor }} onClick={() => post('/api/admin/stamps', stamp)}>
              Créer tampon
            </button>
          </div>

          {/* Tampons existants */}
          <h2>Tous les tampons</h2>
          <table>
            <tbody>
              {data?.stamps?.map((s: any) =>
                <tr key={s.id}>
                  <td>{s.isActive ? '🟢' : '⚪'}</td>
                  <td>
                    <img
                      src={s.imageUrl?.startsWith('/stamps/') ? `.${s.imageUrl}` : s.imageUrl}
                      alt={s.title}
                      style={{ width: 42, height: 42, objectFit: 'contain', marginRight: 8 }}
                    />
                    {s.title}
                  </td>
                  <td>{s.kind}</td>
                  <td>
                    <button className="btn" style={{ background: theme.buttonColor }} onClick={() => post('/api/admin/active-stamp', { stampId: s.id })}>
                      Activer
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Collection Noël */}
          <h2>Collection 🎄 Noël 2026</h2>
          <div className="collection-progress">
            {data?.stamps.filter((s:any) => s.imageUrl.includes('/christmas/')).length || 0} / 16 tampons débloqués
          </div>
          <div className="collection-grid">
            {Array.from({ length: 16 }).map((_, i) => {
              const s = data?.stamps.find((st: any) => st.imageUrl?.includes(`/christmas/daily-christmas-${i + 1}.png`));
              return (
                <div key={i} className={`collection-slot ${s ? 'unlocked' : ''}`}>
                  {s ? <img src={s.imageUrl} alt={s.title} /> : null}
                  <small>{s ? s.title : `Noël ${i + 1}`}</small>
                </div>
              );
            })}
          </div>

          {/* Récompenses */}
          <h2>Récompense</h2>
          <div className="form">
            <input value={reward.title} onChange={e => setReward({ ...reward, title: e.target.value })} />
            <textarea value={reward.description} onChange={e => setReward({ ...reward, description: e.target.value })} />
            <input type="number" value={reward.requiredStamps} onChange={e => setReward({ ...reward, requiredStamps: +e.target.value })} />
            <button className="btn" style={{ background: theme.buttonColor }} onClick={() => post('/api/admin/rewards', reward)}>
              Créer récompense
            </button>
          </div>

          <h2>Récompenses existantes</h2>
          <table>
            <tbody>
              {data?.rewards?.map((r: any) =>
                <tr key={r.id}>
                  <td>{r.requiredStamps}</td>
                  <td>{r.title}</td>
                  <td>{r.description}</td>
                </tr>
              )}
            </tbody>
          </table>

        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Broadcaster />);