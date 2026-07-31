/**
 * Admin rates & tariffs — manage exchange rates and fee tariffs.
 */
import { useEffect, useState, useCallback } from 'react';
import { ratesApi } from '../../api/client';
import type { ExchangeRate, Tariff } from '../../types';

export default function AdminRates() {
  const [tab, setTab] = useState<'rates' | 'tariffs'>('rates');
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [rateForm, setRateForm] = useState({ from_currency: 'XAF', to_currency: 'XOF', rate: '' });
  const [tariffForm, setTariffForm] = useState({ min_amount: '', max_amount: '', fee_percent: '', fixed_fee: '' });

  const load = useCallback(async () => {
    const [r, t] = await Promise.all([ratesApi.list(), ratesApi.tariffs()]);
    setRates(r); setTariffs(t);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveRate(e: React.FormEvent) {
    e.preventDefault();
    await ratesApi.upsert({ ...rateForm, rate: parseFloat(rateForm.rate) });
    setRateForm({ from_currency: 'XAF', to_currency: 'XOF', rate: '' });
    load();
  }

  async function saveTariff(e: React.FormEvent) {
    e.preventDefault();
    await ratesApi.upsertTariff({
      min_amount: parseFloat(tariffForm.min_amount),
      max_amount: parseFloat(tariffForm.max_amount),
      fee_percent: parseFloat(tariffForm.fee_percent),
      fixed_fee: parseFloat(tariffForm.fixed_fee),
    });
    setTariffForm({ min_amount: '', max_amount: '', fee_percent: '', fixed_fee: '' });
    load();
  }

  async function removeTariff(id: number) {
    if (!confirm('Delete tariff?')) return;
    await ratesApi.removeTariff(id);
    load();
  }

  return (
    <>
      <h1 className="page-title">Rates & Tariffs</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn sm ${tab === 'rates' ? '' : 'outline'}`} onClick={() => setTab('rates')}>Exchange Rates</button>
        <button className={`btn sm ${tab === 'tariffs' ? '' : 'outline'}`} onClick={() => setTab('tariffs')}>Fee Tariffs</button>
      </div>

      {tab === 'rates' ? (
        <>
          <div className="card">
            <h3>Add / Update rate</h3>
            <form onSubmit={saveRate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="form-select" style={{ flex: 1, minWidth: 100 }} value={rateForm.from_currency} onChange={(e) => setRateForm({ ...rateForm, from_currency: e.target.value })}>
                <option value="XAF">XAF</option><option value="XOF">XOF</option><option value="GNF">GNF</option><option value="EUR">EUR</option><option value="USD">USD</option>
              </select>
              <select className="form-select" style={{ flex: 1, minWidth: 100 }} value={rateForm.to_currency} onChange={(e) => setRateForm({ ...rateForm, to_currency: e.target.value })}>
                <option value="XOF">XOF</option><option value="XAF">XAF</option><option value="GNF">GNF</option><option value="EUR">EUR</option><option value="USD">USD</option>
              </select>
              <input className="form-input" style={{ flex: 1, minWidth: 100 }} type="number" step="0.01" value={rateForm.rate} onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })} placeholder="Rate" required />
              <button className="btn sm" type="submit">Save</button>
            </form>
          </div>
          <table className="tbl">
            <thead><tr><th>From</th><th>To</th><th>Rate</th><th>Updated</th></tr></thead>
            <tbody>
              {rates.map((r) => (<tr key={r.id}><td>{r.from_currency}</td><td>{r.to_currency}</td><td>{r.rate}</td><td>{new Date(r.updated_at).toLocaleDateString()}</td></tr>))}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <div className="card">
            <h3>Add tariff</h3>
            <form onSubmit={saveTariff} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="form-input" style={{ flex: 1, minWidth: 120 }} type="number" value={tariffForm.min_amount} onChange={(e) => setTariffForm({ ...tariffForm, min_amount: e.target.value })} placeholder="Min amount" required />
              <input className="form-input" style={{ flex: 1, minWidth: 120 }} type="number" value={tariffForm.max_amount} onChange={(e) => setTariffForm({ ...tariffForm, max_amount: e.target.value })} placeholder="Max amount" required />
              <input className="form-input" style={{ flex: 1, minWidth: 100 }} type="number" step="0.1" value={tariffForm.fee_percent} onChange={(e) => setTariffForm({ ...tariffForm, fee_percent: e.target.value })} placeholder="Fee %" required />
              <input className="form-input" style={{ flex: 1, minWidth: 100 }} type="number" value={tariffForm.fixed_fee} onChange={(e) => setTariffForm({ ...tariffForm, fixed_fee: e.target.value })} placeholder="Fixed fee" required />
              <button className="btn sm" type="submit">Save</button>
            </form>
          </div>
          <table className="tbl">
            <thead><tr><th>Min</th><th>Max</th><th>Fee %</th><th>Fixed fee</th><th></th></tr></thead>
            <tbody>
              {tariffs.map((t) => (<tr key={t.id}><td>{t.min_amount}</td><td>{t.max_amount}</td><td>{t.fee_percent}%</td><td>{t.fixed_fee}</td><td><button className="btn sm red" onClick={() => removeTariff(t.id)}>Del</button></td></tr>))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
