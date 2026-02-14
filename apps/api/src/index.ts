import express from 'express';
import cors from 'cors';
import path from 'path';
import { db, createOrder, addEmployee, addShift, getBeachSpotsForDate, reserveSpot, checkInSpot, checkOutSpot, getBeachConfig, updateBeachConfig } from './data';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/products', (_req, res) => res.json(db.products));
app.get('/api/orders', (_req, res) => res.json(db.orders));
app.post('/api/orders', (req, res) => {
  const { items, table } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items obbligatorio' });
  const order = createOrder(items, table);
  res.status(201).json(order);
});
app.get('/api/employees', (_req, res) => res.json(db.employees));
app.post('/api/employees', (req, res) => {
  const { name, role } = req.body || {};
  if (!name || !role) return res.status(400).json({ error: 'name e role obbligatori' });
  const e = addEmployee({ name, role });
  res.status(201).json(e);
});
app.get('/api/shifts', (_req, res) => res.json(db.shifts));
app.post('/api/shifts', (req, res) => {
  const { employeeId, start, end } = req.body || {};
  if (!employeeId || !start || !end) return res.status(400).json({ error: 'employeeId, start, end obbligatori' });
  const e = db.employees.find(x => x.id === employeeId);
  if (!e) return res.status(404).json({ error: 'Dipendente non trovato' });
  const s = addShift({ employeeId, start, end });
  res.status(201).json(s);
});

app.get('/api/beach/spots', (req, res) => {
  const date = String(req.query.date || '').slice(0, 10);
  if (!date) return res.status(400).json({ error: 'date obbligatoria (YYYY-MM-DD)' });
  const spots = getBeachSpotsForDate(date);
  res.json(spots);
});
app.post('/api/beach/reservations', (req, res) => {
  const { spotId, name, date } = req.body || {};
  if (!spotId || !name || !date) return res.status(400).json({ error: 'spotId, name, date obbligatori' });
  const r = reserveSpot(spotId, name, date);
  if (!r) return res.status(404).json({ error: 'Postazione non trovata' });
  res.status(201).json(r);
});
app.post('/api/beach/checkin', (req, res) => {
  const { spotId, date } = req.body || {};
  if (!spotId || !date) return res.status(400).json({ error: 'spotId, date obbligatori' });
  const r = checkInSpot(spotId, date);
  if (!r) return res.status(404).json({ error: 'Postazione non trovata' });
  res.json(r);
});
app.post('/api/beach/checkout', (req, res) => {
  const { spotId, date } = req.body || {};
  if (!spotId || !date) return res.status(400).json({ error: 'spotId, date obbligatori' });
  const r = checkOutSpot(spotId, date);
  if (!r) return res.status(404).json({ error: 'Nessuna prenotazione trovata' });
  res.json(r);
});
app.get('/api/beach/reservations', (req, res) => {
  const date = String(req.query.date || '').slice(0, 10);
  if (date) return res.json(db.beachReservations.filter(x => x.date === date));
  res.json(db.beachReservations);
});
app.get('/api/beach/config', (_req, res) => {
  res.json(getBeachConfig());
});
app.post('/api/beach/config', (req, res) => {
  const cfg = updateBeachConfig(req.body || {});
  res.json(cfg);
});

// Static assets (serve web build)
const staticDir = path.resolve(__dirname, '../../web/dist');
app.use(express.static(staticDir));
// SPA fallback for non-API routes
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(PORT, () => {
  console.log(`POS server in esecuzione: http://localhost:${PORT}`);
});
