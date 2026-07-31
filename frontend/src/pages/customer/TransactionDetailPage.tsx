/**
 * Transaction detail page — shows full transaction info, status history, and proof upload.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import { txApi, uploadApi } from '../../api/client';
import BrandHeader from '../../components/BrandHeader';
import BottomNav from '../../components/BottomNav';
import { TYPE_META, STATUS_META, fmtMoney, fmtDateTime, statusBadge } from '../../components/ui';

export default function TransactionDetailPage() {
  const { id } = useParams();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofRef, setProofRef] = useState('');
  const [proofSender, setProofSender] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await txApi.detail(parseInt(id!));
      setTx(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function uploadProof(e: React.FormEvent) {
    e.preventDefault();
    if (!proofFile) return;
    setBusy(true); setMsg('');
    try {
      const up = await uploadApi.upload(proofFile);
      await txApi.uploadProof(tx.id, { proof_url: up.url, proof_reference: proofRef || undefined, proof_sender_number: proofSender || undefined });
      setMsg('Proof uploaded successfully');
      setProofFile(null); setProofRef(''); setProofSender('');
      load();
    } catch (e: any) {
      setMsg(e.response?.data?.error || 'Upload failed');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="app-shell"><BrandHeader /><div className="page"><div className="empty-state"><i className="fa-solid fa-spinner fa-spin" /></div></div><BottomNav /></div>;
  if (!tx) return <div className="app-shell"><BrandHeader /><div className="page"><div className="empty-state"><i className="fa-solid fa-circle-xmark" /><p>Not found</p><button className="btn outline sm" onClick={() => nav('/transactions')}>Back</button></div></div><BottomNav /></div>;

  const transaction = tx.transaction || tx;
  const history: any[] = tx.history || tx.status_history || [];
  const receipts: any[] = tx.receipts || [];
  const tm = TYPE_META[transaction.type];
  const sm = STATUS_META[transaction.status];

  return (
    <div className="app-shell">
      <BrandHeader />
      <div className="page">
        <button className="btn outline sm" onClick={() => nav('/transactions')} style={{ marginBottom: 12 }}>
          <i className="fa-solid fa-arrow-left" /> {lang === 'fr' ? 'Retour' : 'Back'}
        </button>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className={`tx-icon ${transaction.type}`} style={{ width: 56, height: 56, margin: '0 auto 12px', fontSize: 24 }}>
            <i className={`fa-solid ${tm.icon}`} />
          </div>
          <h3>{lang === 'fr' ? tm.labelFr : tm.label}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0' }}>{transaction.reference}</p>
          <p style={{ marginTop: 8 }}>{statusBadge(transaction.status, lang)}</p>
        </div>

        <div className="card">
          <h3>{lang === 'fr' ? 'Détails' : 'Details'}</h3>
          <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Amount sent</span><b>{fmtMoney(transaction.amount_sent, transaction.currency_sent)}</b></div>
          <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Amount received</span><b>{fmtMoney(transaction.amount_received, transaction.currency_received)}</b></div>
          <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Fee</span><b>{fmtMoney(transaction.fee, transaction.currency_sent)}</b></div>
          <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Exchange rate</span><b>{transaction.exchange_rate}</b></div>
          <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>From → To</span><b>{transaction.source_country} → {transaction.dest_country}</b></div>
          {transaction.receiver_phone && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Receiver</span><b>{transaction.receiver_phone}</b></div>}
          {transaction.sender_phone && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Sender</span><b>{transaction.sender_phone}</b></div>}
          <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Created</span><b>{fmtDateTime(transaction.created_at)}</b></div>
          {transaction.admin_note && <div className="toggle-row"><span style={{ color: 'var(--text-muted)' }}>Admin note</span><b style={{ color: 'var(--red)' }}>{transaction.admin_note}</b></div>}
        </div>

        {/* Proof upload */}
        {(transaction.status === 'awaiting_proof' || transaction.status === 'awaiting_payment') && transaction.type === 'deposit' && (
          <div className="card">
            <h3>{lang === 'fr' ? 'Télécharger la preuve' : 'Upload proof of payment'}</h3>
            {msg && <div className="alert alert-success"><i className="fa-solid fa-check" /> {msg}</div>}
            <form onSubmit={uploadProof}>
              <div className="form-group">
                <label>Payment screenshot / receipt</label>
                <input className="form-input" type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} required />
              </div>
              <div className="form-group">
                <label>Transaction reference (from your payment)</label>
                <input className="form-input" value={proofRef} onChange={(e) => setProofRef(e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label>Sender phone number</label>
                <input className="form-input" value={proofSender} onChange={(e) => setProofSender(e.target.value)} placeholder="+237..." />
              </div>
              <button className="btn green" type="submit" disabled={busy}>
                {busy ? <span className="spinner" /> : <>{lang === 'fr' ? 'Télécharger' : 'Upload'} <i className="fa-solid fa-upload" /></>}
              </button>
            </form>
          </div>
        )}

        {/* Status history */}
        {history.length > 0 && (
          <div className="card">
            <h3>{lang === 'fr' ? 'Historique des statuts' : 'Status history'}</h3>
            {history.map((h, i) => (
              <div key={i} className="toggle-row" style={{ fontSize: 13 }}>
                <span><i className={`fa-solid ${STATUS_META[h.status]?.icon ?? 'fa-clock'}`} style={{ marginRight: 6 }} /> {lang === 'fr' ? STATUS_META[h.status]?.labelFr : STATUS_META[h.status]?.label}</span>
                <b style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{fmtDateTime(h.created_at)}</b>
              </div>
            ))}
          </div>
        )}

        {/* Receipts */}
        {receipts.length > 0 && (
          <div className="card">
            <h3>{lang === 'fr' ? 'Reçus' : 'Receipts'}</h3>
            {receipts.map((r, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontSize: 13 }}>
                  <i className="fa-solid fa-file" /> {r.label || `Receipt ${i + 1}`}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
