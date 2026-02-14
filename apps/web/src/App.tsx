import { useEffect, useMemo, useState } from 'react';

type Product = { id: string; name: string; price: number; category?: string; imageUrl?: string };
type Employee = { id: string; name: string; role: 'cameriere' | 'barista' | 'cuoco' | 'manager' };
type Shift = { id: string; employeeId: string; start: string; end: string };
type BeachSpot = { id: string; row: number; col: number; type: 'ombrellone' | 'lettino'; status: 'free' | 'booked' | 'checked_in'; name?: string };
type BeachReservation = { id: string; spotId: string; name: string; date: string; status: 'booked' | 'checked_in' | 'completed' };
type BeachConfig = { rows: number; cols: number; walkwayEvery: number; premiumRows: number };

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px',
        border: '1px solid #1f2937',
        background: active ? '#0b79d0' : '#0f1b2e',
        color: active ? '#fff' : '#c5d2e8',
        borderRadius: 8,
        cursor: 'pointer'
      }}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [view, setView] = useState<'landing' | 'app'>(() => (location.hash === '#app' ? 'app' : 'landing'));
  const [tab, setTab] = useState<'pos' | 'turni' | 'lido' | 'prenotazioni'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [table, setTable] = useState('');
  const [logoVisible, setLogoVisible] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<Employee['role']>('cameriere');
  const [shiftEmp, setShiftEmp] = useState<string>('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [beachDate, setBeachDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [beachSpots, setBeachSpots] = useState<BeachSpot[]>([]);
  const [beachCfg, setBeachCfg] = useState<BeachConfig | null>(null);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [resvDate, setResvDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reservations, setReservations] = useState<BeachReservation[]>([]);
  const [orders, setOrders] = useState<{ id: string; total: number; table?: string; createdAt: string }[]>([]);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);
  useEffect(() => {
    document.title = 'Nami POS';
  }, []);
  useEffect(() => {
    const onHash = () => setView(location.hash === '#app' ? 'app' : 'landing');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (tab === 'turni') {
      fetch('/api/employees').then(r => r.json()).then(setEmployees);
      fetch('/api/shifts').then(r => r.json()).then(setShifts);
    }
    if (tab === 'lido') {
      fetch('/api/beach/config').then(r => r.json()).then(setBeachCfg);
      fetch('/api/beach/spots?date=' + beachDate).then(r => r.json()).then(setBeachSpots);
    }
    if (tab === 'prenotazioni') {
      fetch('/api/beach/reservations?date=' + resvDate).then(r => r.json()).then(setReservations);
      fetch('/api/orders').then(r => r.json()).then(setOrders);
    }
  }, [tab, beachDate, resvDate]);

  const total = useMemo(() => {
    return Object.keys(cart).reduce((sum, id) => {
      const p = products.find(x => x.id === id);
      return sum + (p ? p.price * (cart[id] || 0) : 0);
    }, 0);
  }, [cart, products]);

  function addToCart(id: string) {
    setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function updateQty(id: string, delta: number) {
    setCart(c => {
      const q = (c[id] || 0) + delta;
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = q;
      return n;
    });
  }
  async function pay() {
    const items = Object.keys(cart).map(productId => ({ productId, qty: cart[productId] }));
    if (items.length === 0) return;
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, table: table || undefined }) });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || 'Errore');
    alert(`Ordine ${data.id} registrato. Totale € ${Number(data.total).toFixed(2)}`);
    setCart({}); setTable('');
  }

  async function addEmployee() {
    const name = empName.trim();
    if (!name) return;
    const res = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, role: empRole }) });
    if (res.ok) {
      setEmpName('');
      const emps = await fetch('/api/employees').then(r => r.json());
      setEmployees(emps);
    }
  }
  async function addShift() {
    if (!shiftEmp || !shiftStart || !shiftEnd) return;
    const res = await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: shiftEmp, start: shiftStart, end: shiftEnd }) });
    if (res.ok) {
      setShiftStart(''); setShiftEnd('');
      const sh = await fetch('/api/shifts').then(r => r.json());
      setShifts(sh);
    }
  }
  async function clickSpot(s: BeachSpot) {
    if (s.status === 'free') {
      const name = window.prompt('Nome cliente per prenotare?');
      if (!name) return;
      const res = await fetch('/api/beach/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spotId: s.id, name, date: beachDate }) });
      if (res.ok) setBeachSpots(await fetch('/api/beach/spots?date=' + beachDate).then(r => r.json()));
    } else if (s.status === 'booked') {
      const ok = window.confirm('Effettuare check-in?');
      if (!ok) return;
      const res = await fetch('/api/beach/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spotId: s.id, date: beachDate }) });
      if (res.ok) setBeachSpots(await fetch('/api/beach/spots?date=' + beachDate).then(r => r.json()));
    } else if (s.status === 'checked_in') {
      const ok = window.confirm('Eseguire check-out e liberare la postazione?');
      if (!ok) return;
      const res = await fetch('/api/beach/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spotId: s.id, date: beachDate }) });
      if (res.ok) setBeachSpots(await fetch('/api/beach/spots?date=' + beachDate).then(r => r.json()));
    }
  }

  if (view === 'landing') {
    return (
      <div className="landing">
        <div className="impact-hero">
          <div className="container">
            <div className="landing-top">
              {logoVisible ? (
                <img className="brand-logo" src="/logo-nami.png" alt="Nami logo" onError={() => setLogoVisible(false)} />
              ) : (
                <div className="landing-brand">Nami POS</div>
              )}
              <div></div>
            </div>
            <div>
              <div className="badge">Suite per bar, ristoranti e lidi</div>
              <h1 className="impact-title">Vendi più veloce. Gestisci turni e lido in un’unica app.</h1>
              <div className="impact-sub">Touch ottimizzato, comande mobile, mappa lido realistica e un design premium.</div>
              <div className="impact-cta">
                <button className="primary" onClick={() => { setTab('pos'); location.hash = '#app'; setView('app'); }}>Prova il POS</button>
                <button className="ghost" onClick={() => { setTab('lido'); location.hash = '#app'; setView('app'); }}>Gestione Lido</button>
                {/* App Camerieri rimossa */}
              </div>
              <div className="trust">
                <div>Touch‑first</div>
                <div>Gestione turni</div>
                <div>Lido realistico</div>
              </div>
            </div>
            <div>
              <div className="bento">
                <div className="card">
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Cassa Touch</div>
                  <div className="screenshot"></div>
                </div>
                <div className="split">
                  <div className="card">
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Comande Mobile</div>
                    <div className="screenshot"></div>
                  </div>
                  <div className="card">
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Lido</div>
                    <div className="screenshot"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="wave"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          {logoVisible ? (
            <img className="brand-logo" src="/logo-nami.png" alt="Nami logo" onError={() => setLogoVisible(false)} />
          ) : (
            'Nami POS'
          )}
        </div>
        <div className="nav">
          <button className={`nav-btn ${tab === 'pos' ? 'active' : ''}`} onClick={() => setTab('pos')}>Cassa</button>
          <button className={`nav-btn ${tab === 'turni' ? 'active' : ''}`} onClick={() => setTab('turni')}>Turni</button>
          <button className={`nav-btn ${tab === 'lido' ? 'active' : ''}`} onClick={() => setTab('lido')}>Lido</button>
          <button className={`nav-btn ${tab === 'prenotazioni' ? 'active' : ''}`} onClick={() => setTab('prenotazioni')}>Prenotazioni</button>
        </div>
      </aside>
      <div className="content">
        <div className="topbar"></div>
        {tab === 'pos' ? (
          <div className="page">
            <section className="panel">
              <h2 style={{ margin: '4px 0 12px 0' }}>Prodotti</h2>
              <div className="grid">
                {products.map(p => (
                  <button key={p.id} className="btn" onClick={() => addToCart(p.id)}>
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : null}
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div className="price">€ {p.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </section>
            <aside className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2 style={{ margin: '4px 0 12px 0' }}>Scontrino</h2>
              <div className="cart">
                {Object.keys(cart).map(id => {
                  const p = products.find(x => x.id === id);
                  if (!p) return null;
                  const qty = cart[id];
                  return (
                    <div key={id} className="cart-item">
                      <div>{p.name}</div>
                      <div className="qty">
                        <button onClick={() => updateQty(id, -1)}>-</button>
                        <span>{qty}</span>
                        <button onClick={() => updateQty(id, +1)}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="footer">
                <div className="row">
                  <label htmlFor="table">Tavolo</label>
                <input id="table" value={table} onChange={e => setTable(e.target.value)} placeholder="es. 5" style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #e6e8ee', borderRadius: 10, padding: 10, width: 120 }} />
                </div>
                <div className="row">
                  <strong>Totale: € {total.toFixed(2)}</strong>
                  <button className="primary" onClick={pay}>Paga</button>
                </div>
              </div>
            </aside>
          </div>
        ) : tab === 'turni' ? (
          <div className="page" style={{ gridTemplateColumns: '1fr' }}>
            <section className="panel">
              <h2 style={{ margin: '4px 0 12px 0' }}>Dipendenti & Turni</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <input value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Nome" style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #e6e8ee', borderRadius: 10, padding: 10 }} />
                <select value={empRole} onChange={e => setEmpRole(e.target.value as Employee['role'])} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #e6e8ee', borderRadius: 10, padding: 10 }}>
                  <option value="cameriere">Cameriere</option>
                  <option value="barista">Barista</option>
                  <option value="cuoco">Cuoco</option>
                  <option value="manager">Manager</option>
                </select>
                <button onClick={addEmployee} className="primary">Aggiungi Dipendente</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <h3>Dipendenti</h3>
                  <div className="list">
                    {employees.map(e => (
                      <div key={e.id} className="list-item">
                        <div>{e.name}</div>
                        <div style={{ color: '#93c5fd' }}>{e.role}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Turni</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <select value={shiftEmp} onChange={e => setShiftEmp(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #e6e8ee', borderRadius: 10, padding: 10, minWidth: 200 }} >
                      <option value="">Seleziona</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <input type="datetime-local" value={shiftStart} onChange={e => setShiftStart(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #e6e8ee', borderRadius: 10, padding: 10 }} />
                    <input type="datetime-local" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #e6e8ee', borderRadius: 10, padding: 10 }} />
                    <button onClick={addShift} className="primary">Aggiungi Turno</button>
                  </div>
                  <div className="list">
                    {shifts.map(s => {
                      const e = employees.find(x => x.id === s.employeeId);
                      const name = e?.name || s.employeeId;
                      const start = new Date(s.start).toLocaleString();
                      const end = new Date(s.end).toLocaleString();
                      return (
                        <div key={s.id} className="list-item">
                          <div>{name}</div>
                          <div style={{ color: '#93c5fd' }}>{start} → {end}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : tab === 'prenotazioni' ? (
          <div className="page" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <section className="panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>Prenotazioni Lido</h2>
                <input type="date" value={resvDate} onChange={e => setResvDate(e.target.value)} />
              </div>
              <div className="list">
                {reservations.map(r => (
                  <div key={r.id} className="list-item">
                    <div>Posto {r.spotId} • {r.name}</div>
                    <div style={{ color: r.status === 'checked_in' ? '#b91c1c' : '#065f46' }}>{r.status}</div>
                  </div>
                ))}
                {!reservations.length ? <div className="list-item"><div>Nessuna prenotazione</div></div> : null}
              </div>
            </section>
            <section className="panel">
              <h2 style={{ marginTop: 0 }}>Transazioni</h2>
              <div className="list">
                {orders.map(o => (
                  <div key={o.id} className="list-item">
                    <div>{new Date(o.createdAt).toLocaleString()}</div>
                    <div>€ {Number(o.total).toFixed(2)}</div>
                  </div>
                ))}
                {!orders.length ? <div className="list-item"><div>Nessuna transazione</div></div> : null}
              </div>
            </section>
          </div>
        ) : (
          <div className="page" style={{ gridTemplateColumns: '1fr' }}>
            <section className="panel">
              <div className="lido-top">
                <h2 style={{ margin: 0, marginRight: 8 }}>Lido</h2>
                <input type="date" value={beachDate} onChange={e => setBeachDate(e.target.value)} />
                <button className="primary" onClick={() => setCfgOpen(v => !v)} style={{ padding: '8px 10px' }}>{cfgOpen ? 'Chiudi' : 'Impostazioni'}</button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div className="spot free" style={{ padding: '4px 8px' }}>Bianco</div>
                  <div className="spot booked" style={{ padding: '4px 8px' }}>Verde</div>
                  <div className="spot checked_in" style={{ padding: '4px 8px' }}>Rosso</div>
                </div>
              </div>
              {cfgOpen && beachCfg ? (
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <label>Righe</label>
                    <input type="number" min={1} max={30} defaultValue={beachCfg.rows} id="cfg-rows" />
                    <label>Colonne</label>
                    <input type="number" min={1} max={40} defaultValue={beachCfg.cols} id="cfg-cols" />
                    <label>Passerella ogni</label>
                    <input type="number" min={0} max={20} defaultValue={beachCfg.walkwayEvery} id="cfg-walk" />
                    <label>File premium</label>
                    <input type="number" min={0} max={10} defaultValue={beachCfg.premiumRows} id="cfg-prem" />
                    <button className="primary" onClick={async () => {
                      const rows = Number((document.getElementById('cfg-rows') as HTMLInputElement).value);
                      const cols = Number((document.getElementById('cfg-cols') as HTMLInputElement).value);
                      const walkwayEvery = Number((document.getElementById('cfg-walk') as HTMLInputElement).value);
                      const premiumRows = Number((document.getElementById('cfg-prem') as HTMLInputElement).value);
                      const res = await fetch('/api/beach/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows, cols, walkwayEvery, premiumRows }) });
                      if (res.ok) {
                        const cfg = await res.json();
                        setBeachCfg(cfg);
                        setBeachSpots(await fetch('/api/beach/spots?date=' + beachDate).then(r => r.json()));
                      }
                    }}>Applica</button>
                  </div>
                </div>
              ) : null}
              <div className="lido-wrapper">
                <div className="sea">Mare</div>
                <div className="lido-grid">
                  {beachSpots.map(s => {
                    const walk = beachCfg?.walkwayEvery ?? 4;
                    const isWalkway = walk > 0 && s.col % walk === 0;
                    const onClick = isWalkway ? undefined : () => clickSpot(s);
                    return (
                      <div key={s.id} className={`spot ${s.status} ${(beachCfg && s.row <= beachCfg.premiumRows) ? 'premium nearsea' : (s.row <= 2 ? 'nearsea' : '')} ${isWalkway ? 'walkway' : ''}`} onClick={onClick}>
                        {!isWalkway ? (
                          <>
                            <div className="icon-area">
                              <div className="umbrella"></div>
                              <div className="beds"><span className="bed" /><span className="bed" /></div>
                            </div>
                            <div className="label">R{s.row}-P{s.col}</div>
                            {s.name ? <div className="customer">{s.name}</div> : null}
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
