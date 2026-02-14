import { useEffect, useMemo, useState } from 'react';

type Product = { id: string; name: string; price: number; category?: string; imageUrl?: string };
type Employee = { id: string; name: string; role: 'cameriere' | 'barista' | 'cuoco' | 'manager' };
type Shift = { id: string; employeeId: string; start: string; end: string };
type BeachSpot = { id: string; row: number; col: number; type: 'ombrellone' | 'lettino'; status: 'free' | 'booked' | 'checked_in' };

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
  const [tab, setTab] = useState<'pos' | 'turni' | 'lido'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [table, setTable] = useState('');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<Employee['role']>('cameriere');
  const [shiftEmp, setShiftEmp] = useState<string>('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [beachDate, setBeachDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [beachSpots, setBeachSpots] = useState<BeachSpot[]>([]);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  useEffect(() => {
    if (tab === 'turni') {
      fetch('/api/employees').then(r => r.json()).then(setEmployees);
      fetch('/api/shifts').then(r => r.json()).then(setShifts);
    }
    if (tab === 'lido') {
      fetch('/api/beach/spots?date=' + beachDate).then(r => r.json()).then(setBeachSpots);
    }
  }, [tab, beachDate]);

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

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">POS Manager</div>
        <div className="nav">
          <button className={`nav-btn ${tab === 'pos' ? 'active' : ''}`} onClick={() => setTab('pos')}>Cassa</button>
          <button className={`nav-btn ${tab === 'turni' ? 'active' : ''}`} onClick={() => setTab('turni')}>Turni</button>
          <button className={`nav-btn ${tab === 'lido' ? 'active' : ''}`} onClick={() => setTab('lido')}>Lido</button>
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
                  <input id="table" value={table} onChange={e => setTable(e.target.value)} placeholder="es. 5" style={{ background: '#0f1b2e', color: '#c5d2e8', border: '1px solid #1f2937', borderRadius: 8, padding: 8, width: 100 }} />
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
                <input value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Nome" style={{ background: '#0f1b2e', color: '#c5d2e8', border: '1px solid #1f2937', borderRadius: 8, padding: 8 }} />
                <select value={empRole} onChange={e => setEmpRole(e.target.value as Employee['role'])} style={{ background: '#0f1b2e', color: '#c5d2e8', border: '1px solid # Madd', borderRadius: 8, padding: 8 }}>
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
                    <select value={shiftEmp} onChange={e => setShiftEmp(e.target.value)} style={{ background: '#0f1b2e', color: '#c5d2e8', border: '1px solid #1f2937', borderRadius: 8, padding: 8, minWidth: 180 }} >
                      <option value="">Seleziona</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <input type="datetime-local" value={shiftStart} onChange={e => setShiftStart(e.target.value)} style={{ background: '#0f1b2e', color: '#c5d2e8', border: '1px solid #1f2937', borderRadius: 8, padding: 8 }} />
                    <input type="datetime-local" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} style={{ background: '#0f1b2e', color: '#c5d2e8', border: '1px solid #1f2937', borderRadius: 8, padding: 8 }} />
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
        ) : (
          <div className="page" style={{ gridTemplateColumns: '1fr' }}>
            <section className="panel">
              <div className="lido-top">
                <h2 style={{ margin: 0, marginRight: 8 }}>Lido</h2>
                <input type="date" value={beachDate} onChange={e => setBeachDate(e.target.value)} />
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div className="spot free" style={{ padding: '4px 8px' }}>Libero</div>
                  <div className="spot booked" style={{ padding: '4px 8px' }}>Prenotato</div>
                  <div className="spot checked_in" style={{ padding: '4px 8px' }}>Occupato</div>
                </div>
              </div>
              <div className="lido-grid">
                {beachSpots.map(s => (
                  <div key={s.id} className={`spot ${s.status}`} onClick={() => clickSpot(s)}>
                    <div>{s.id}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
