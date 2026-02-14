export type Product = { id: string; name: string; price: number; category?: string };
export type OrderItem = { productId: string; qty: number };
export type Order = { id: string; items: OrderItem[]; total: number; table?: string; createdAt: string };
export type Employee = { id: string; name: string; role: 'cameriere' | 'barista' | 'cuoco' | 'manager' };
export type Shift = { id: string; employeeId: string; start: string; end: string };

const id = () => Math.random().toString(36).slice(2, 10);

export const db = {
  products: [
    { id: id(), name: 'Espresso', price: 1.2, category: 'Caffetteria' },
    { id: id(), name: 'Cappuccino', price: 1.8, category: 'Caffetteria' },
    { id: id(), name: 'Cornetto', price: 1.5, category: 'Colazione' },
    { id: id(), name: 'Panino', price: 4.5, category: 'Cucina' },
    { id: id(), name: 'Acqua 0.5L', price: 1.0, category: 'Bevande' }
  ] as Product[],
  orders: [] as Order[],
  employees: [
    { id: id(), name: 'Luca', role: 'barista' },
    { id: id(), name: 'Sara', role: 'cameriere' },
    { id: id(), name: 'Marco', role: 'cuoco' }
  ] as Employee[],
  shifts: [] as Shift[]
};

export function createOrder(items: OrderItem[], table?: string): Order {
  const total = items.reduce((sum, it) => {
    const p = db.products.find(p => p.id === it.productId);
    return sum + (p ? p.price * it.qty : 0);
  }, 0);
  const order: Order = { id: id(), items, total: Math.round(total * 100) / 100, table, createdAt: new Date().toISOString() };
  db.orders.push(order);
  return order;
}

export function addEmployee(emp: Omit<Employee, 'id'>): Employee {
  const e: Employee = { ...emp, id: id() };
  db.employees.push(e);
  return e;
}

export function addShift(shift: Omit<Shift, 'id'>): Shift {
  const s: Shift = { ...shift, id: id() };
  db.shifts.push(s);
  return s;
}
