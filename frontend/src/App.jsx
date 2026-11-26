import { useEffect, useState } from 'react';
import { api } from './api';

const TABS = [
  { id: 'menu', label: 'Master Menu' },
  { id: 'assign', label: 'Assign' },
  { id: 'pos', label: 'Outlet POS' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'reports', label: 'Reports' },
];

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function App() {
  const [tab, setTab] = useState('menu');
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getCompanies();
        const list = Array.isArray(data) ? data : [];
        setCompanies(list);
        if (list[0]) setCompanyId(list[0].id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        const data = await api.getOutlets(companyId);
        setOutlets(data);
        setOutletId((prev) => prev || (data[0] && data[0].id) || '');
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [companyId]);

  return (
    <div className="app-shell">
      <header className="hero">
        <h1 className="brand">F&amp;B HQ</h1>
        <p>
          Central menu control, outlet assignment, live inventory, and POS sales
          across your restaurant network.
        </p>
      </header>

      <div className="toolbar">
        <label>
          Company
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Active outlet
          <select value={outletId} onChange={(e) => setOutletId(e.target.value)}>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.code})
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading && <p className="empty">Loading…</p>}
      {error && <p className="flash err">{error}</p>}

      {!loading && companyId && (
        <>
          {tab === 'menu' && <MasterMenu companyId={companyId} />}
          {tab === 'assign' && (
            <AssignPanel companyId={companyId} outlets={outlets} outletId={outletId} />
          )}
          {tab === 'pos' && outletId && <PosPanel outletId={outletId} />}
          {tab === 'inventory' && outletId && <InventoryPanel outletId={outletId} />}
          {tab === 'reports' && (
            <ReportsPanel companyId={companyId} outletId={outletId} outlets={outlets} />
          )}
        </>
      )}
    </div>
  );
}

function MasterMenu({ companyId }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    basePrice: '',
  });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.getMasterMenu(companyId);
    setItems(data);
  }

  useEffect(() => {
    load().catch((err) => setMsg({ type: 'err', text: err.message }));
  }, [companyId]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      await api.createMenuItem({
        companyId,
        name: form.name,
        description: form.description || null,
        category: form.category || null,
        basePrice: Number(form.basePrice),
      });
      setForm({ name: '', description: '', category: '', basePrice: '' });
      setMsg({ type: 'ok', text: 'Menu item created' });
      await load();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <h2>Master menu</h2>
        <p className="sub">HQ catalog shared across outlets.</p>
        <ul className="list">
          {items.map((item) => (
            <li key={item.id} className="list-item">
              <div>
                <strong>{item.name}</strong>
                <span className="meta">
                  {item.category || 'Uncategorized'} · {item.description || '—'}
                </span>
              </div>
              <span className="badge">{money(item.base_price)}</span>
            </li>
          ))}
          {items.length === 0 && <li className="empty">No menu items yet.</li>}
        </ul>
      </section>

      <section className="panel">
        <h2>Add item</h2>
        <p className="sub">Create a new master menu item.</p>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="form-row two">
            <label>
              Category
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>
            <label>
              Base price
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              />
            </label>
          </div>
          <label>
            Description
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Create item'}
          </button>
        </form>
        {msg.text && <p className={`flash ${msg.type}`}>{msg.text}</p>}
      </section>
    </div>
  );
}

function AssignPanel({ companyId, outlets, outletId }) {
  const [menu, setMenu] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(outletId);
  const [form, setForm] = useState({
    menuItemId: '',
    priceOverride: '',
    initialStock: '50',
  });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelectedOutlet(outletId);
  }, [outletId]);

  useEffect(() => {
    api
      .getMasterMenu(companyId)
      .then((data) => {
        setMenu(data);
        if (data[0]) setForm((f) => ({ ...f, menuItemId: data[0].id }));
      })
      .catch((err) => setMsg({ type: 'err', text: err.message }));
  }, [companyId]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      await api.assignMenu({
        outletId: selectedOutlet,
        menuItemId: form.menuItemId,
        priceOverride: form.priceOverride === '' ? null : Number(form.priceOverride),
        initialStock: form.initialStock === '' ? 0 : Number(form.initialStock),
        isAvailable: true,
      });
      setMsg({ type: 'ok', text: 'Menu assigned to outlet' });
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Assign to outlet</h2>
      <p className="sub">Push master items to a location with optional price override.</p>
      <form className="form-grid" onSubmit={onSubmit}>
        <div className="form-row two">
          <label>
            Outlet
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Menu item
            <select
              value={form.menuItemId}
              onChange={(e) => setForm({ ...form, menuItemId: e.target.value })}
            >
              {menu.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({money(m.base_price)})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row two">
          <label>
            Price override (optional)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.priceOverride}
              onChange={(e) => setForm({ ...form, priceOverride: e.target.value })}
            />
          </label>
          <label>
            Initial stock
            <input
              type="number"
              min="0"
              value={form.initialStock}
              onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
            />
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy || !selectedOutlet}>
          {busy ? 'Assigning…' : 'Assign item'}
        </button>
      </form>
      {msg.text && <p className={`flash ${msg.type}`}>{msg.text}</p>}
    </section>
  );
}

function PosPanel({ outletId }) {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.getOutletMenu(outletId);
    setMenu(data);
  }

  useEffect(() => {
    setCart({});
    setReceipt(null);
    load().catch((err) => setMsg({ type: 'err', text: err.message }));
  }, [outletId]);

  function setQty(menuItemId, qty) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[menuItemId];
      else next[menuItemId] = qty;
      return next;
    });
  }

  const lines = menu
    .filter((m) => cart[m.menu_item_id])
    .map((m) => ({
      ...m,
      qty: cart[m.menu_item_id],
      lineTotal: Number(m.effective_price) * cart[m.menu_item_id],
    }));

  const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  async function checkout() {
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      const sale = await api.createSale(
        outletId,
        lines.map((l) => ({ menuItemId: l.menu_item_id, quantity: l.qty }))
      );
      setReceipt(sale);
      setCart({});
      setMsg({ type: 'ok', text: `Sale completed · ${sale.receipt_number}` });
      await load();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <h2>Outlet menu</h2>
        <p className="sub">Only items assigned to this outlet.</p>
        <ul className="list">
          {menu.map((item) => (
            <li key={item.menu_item_id} className="list-item">
              <div>
                <strong>{item.name}</strong>
                <span className="meta">
                  Stock {item.stock} · {money(item.effective_price)}
                  {item.price_override != null ? ' (override)' : ''}
                </span>
              </div>
              <div className="cart-qty">
                <button
                  type="button"
                  onClick={() =>
                    setQty(item.menu_item_id, (cart[item.menu_item_id] || 0) - 1)
                  }
                >
                  −
                </button>
                <span>{cart[item.menu_item_id] || 0}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQty(item.menu_item_id, (cart[item.menu_item_id] || 0) + 1)
                  }
                >
                  +
                </button>
              </div>
            </li>
          ))}
          {menu.length === 0 && <li className="empty">No assigned menu items.</li>}
        </ul>
      </section>

      <section className="panel">
        <h2>Cart</h2>
        <p className="sub">Checkout deducts stock and issues a receipt.</p>
        <ul className="list">
          {lines.map((l) => (
            <li key={l.menu_item_id} className="list-item">
              <div>
                <strong>
                  {l.name} × {l.qty}
                </strong>
              </div>
              <span>{money(l.lineTotal)}</span>
            </li>
          ))}
          {lines.length === 0 && <li className="empty">Cart is empty.</li>}
        </ul>
        <p style={{ marginTop: 14, fontWeight: 700 }}>Total {money(total)}</p>
        <button
          className="btn btn-primary"
          disabled={busy || lines.length === 0}
          onClick={checkout}
        >
          {busy ? 'Processing…' : 'Complete sale'}
        </button>
        {msg.text && <p className={`flash ${msg.type}`}>{msg.text}</p>}
        {receipt && (
          <div className="receipt">
            <strong>Receipt {receipt.receipt_number}</strong>
            <div className="meta">Total {money(receipt.total_amount)}</div>
            <ul className="list" style={{ marginTop: 10 }}>
              {receipt.items.map((i) => (
                <li key={i.id} className="list-item">
                  <span>
                    {i.menu_item_name} × {i.quantity}
                  </span>
                  <span>{money(i.line_total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function InventoryPanel({ outletId }) {
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState({ menuItemId: '', quantity: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.getInventory(outletId);
    setRows(data);
    if (data[0]) {
      setEdit({ menuItemId: data[0].menu_item_id, quantity: String(data[0].quantity) });
    }
  }

  useEffect(() => {
    load().catch((err) => setMsg({ type: 'err', text: err.message }));
  }, [outletId]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      await api.setInventory(outletId, {
        menuItemId: edit.menuItemId,
        quantity: Number(edit.quantity),
      });
      setMsg({ type: 'ok', text: 'Stock updated' });
      await load();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <h2>Inventory</h2>
        <p className="sub">Per-outlet stock levels.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.menu_item_name}</td>
                <td>{r.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No inventory rows.</p>}
      </section>

      <section className="panel">
        <h2>Set stock</h2>
        <p className="sub">Negative stock is rejected by the API and DB.</p>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Item
            <select
              value={edit.menuItemId}
              onChange={(e) => setEdit({ ...edit, menuItemId: e.target.value })}
            >
              {rows.map((r) => (
                <option key={r.id} value={r.menu_item_id}>
                  {r.menu_item_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="0"
              required
              value={edit.quantity}
              onChange={(e) => setEdit({ ...edit, quantity: e.target.value })}
            />
          </label>
          <button className="btn btn-primary" disabled={busy || !edit.menuItemId}>
            {busy ? 'Saving…' : 'Update stock'}
          </button>
        </form>
        {msg.text && <p className={`flash ${msg.type}`}>{msg.text}</p>}
      </section>
    </div>
  );
}

function ReportsPanel({ companyId, outletId, outlets }) {
  const [revenue, setRevenue] = useState([]);
  const [top, setTop] = useState([]);
  const [selected, setSelected] = useState(outletId);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    setSelected(outletId);
  }, [outletId]);

  useEffect(() => {
    api
      .getRevenue(companyId)
      .then(setRevenue)
      .catch((err) => setMsg({ type: 'err', text: err.message }));
  }, [companyId]);

  useEffect(() => {
    if (!selected) return;
    api
      .getTopItems(selected)
      .then(setTop)
      .catch((err) => setMsg({ type: 'err', text: err.message }));
  }, [selected]);

  return (
    <div className="grid-2">
      <section className="panel">
        <h2>Revenue by outlet</h2>
        <p className="sub">Company-wide sales totals.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Outlet</th>
              <th>Sales</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {revenue.map((r) => (
              <tr key={r.outlet_id}>
                <td>
                  {r.outlet_name} ({r.outlet_code})
                </td>
                <td>{r.sale_count}</td>
                <td>{money(r.total_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Top 5 items</h2>
        <p className="sub">Best sellers for the selected outlet.</p>
        <label>
          Outlet
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <table className="table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {top.map((t) => (
              <tr key={t.menu_item_id}>
                <td>{t.menu_item_name}</td>
                <td>{t.quantity_sold}</td>
                <td>{money(t.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {top.length === 0 && <p className="empty">No sales yet for this outlet.</p>}
        {msg.text && <p className={`flash ${msg.type}`}>{msg.text}</p>}
      </section>
    </div>
  );
}
