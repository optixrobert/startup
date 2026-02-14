import express from 'express';
import cors from 'cors';
import { db, createOrder, addEmployee, addShift } from './data';

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

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(PORT, () => {
  console.log(`POS server in esecuzione: http://localhost:${PORT}`);
});
