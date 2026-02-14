import { useEffect, useMemo, useState } from 'react';

type Product = { id: string; name: string; price: number; imageUrl?: string };

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [table, setTable] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  const total = useMemo(() => {
    return Object.keys(cart).reduce((sum, id) => {
      const p = products.find(x => x.id === id);
      return sum + (p ? p.price * (cart[id] || 0) : 0);
    }, 0);
  }, [cart, products]);

  function add(id: string) {
    setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function update(id: string, delta: number) {
    setCart(c => {
      const q = (c[id] || 0) + delta;
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = q;
      return n;
    });
  }
  async function send() {
    const items = Object.keys(cart).map(productId => ({ productId, qty: cart[productId] }));
    if (!items.length || !table.trim()) return;
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, table }) });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || 'Errore');
    alert(`Comanda inviata al tavolo ${table}. Totale € ${Number(data.total).toFixed(2)}`);
    setCart({}); setTable(''); setNote('');
  }

  return (
    <div className="app">
      <div className="top">
        <div style={{ fontWeight: 700 }}>Comande</div>
        <div className="row">
          <input placeholder="Tavolo" value={table} onChange={e => setTable(e.target.value)} style={{ width: 88 }} />
        </div>
      </div>
      <div className="grid">
        {products.map(p => (
          <div key={p.id} className="tile">
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : null}
            <button onClick={() => add(p.id)}>
              <div className="name">{p.name}</div>
              <div className="price">€ {p.price.toFixed(2)}</div>
            </button>
          </div>
        ))}
      </div>
      <div className="cart">
        {Object.keys(cart).map(id => {
          const p = products.find(x => x.id === id);
          if (!p) return null;
          const qty = cart[id];
          return (
            <div key={id} className="cart-item">
              <div>{p.name}</div>
              <div className="qty">
                <button onClick={() => update(id, -1)}>-</button>
                <span>{qty}</span>
                <button onClick={() => update(id, +1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="footer">
        <input placeholder="Note cucina" value={note} onChange={e => setNote(e.target.value)} style={{ flex: 1 }} />
        <div style={{ minWidth: 8 }} />
        <div style={{ whiteSpace: 'nowrap' }}>€ {total.toFixed(2)}</div>
        <button className="primary" onClick={send}>Invia</button>
      </div>
    </div>
  );
}
