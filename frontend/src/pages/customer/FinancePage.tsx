/**
 * Finance & Loans page — borrow money (tier-based terms) + borrow flight ticket.
 * Both redirect to admin-configured WhatsApp contact after submission.
 */
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { borrowApi, configApi, uploadApi } from '../../api/client';
import BrandHeader from '../../components/BrandHeader';
import BottomNav from '../../components/BottomNav';
import { fmtMoney, fmtDate } from '../../components/ui';

const TIER_TERMS: Record<string, { interest: number; maxMonths: number; label: string }> = {
  BRONZE: { interest: 15, maxMonths: 6, label: 'BRONZE — 15% interest, up to 6 months' },
  SILVER: { interest: 10, maxMonths: 12, label: 'SILVER — 10% interest, up to 12 months' },
  GOLD:   { interest: 5,  maxMonths: 24, label: 'GOLD — 5% interest, up to 24 months, 1 month free accommodation' },
};

export default function FinancePage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<'money' | 'ticket'>('money');
  const [waNumber, setWaNumber] = useState('+237700000001');

  // load whatsapp number from config
  useState(() => {
    configApi.get().then((c) => setWaNumber(c.app.adminWhatsapp)).catch(() => {});
  });

  return (
    <div className="app-shell">
      <BrandHeader />
      <div className="page">
        <h1 className="page-title">{t('finance.title')}</h1>

        {/* Tier info card */}
        <div className="card">
          <h3><i className="fa-solid fa-medal" style={{ color: 'var(--amber)' }} /> Your tier: {user?.tier}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{TIER_TERMS[user?.tier ?? 'BRONZE'].label}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn sm ${tab === 'money' ? '' : 'outline'}`} onClick={() => setTab('money')}>{t('finance.borrowMoney')}</button>
          <button className={`btn sm ${tab === 'ticket' ? '' : 'outline'}`} onClick={() => setTab('ticket')}>{t('finance.borrowTicket')}</button>
        </div>

        {tab === 'money' ? <BorrowMoneyForm waNumber={waNumber} lang={lang} /> : <BorrowTicketForm waNumber={waNumber} lang={lang} />}
      </div>
      <BottomNav />
    </div>
  );
}

function BorrowMoneyForm({ waNumber, lang }: { waNumber: string; lang: 'en' | 'fr' }) {
  const { user, setUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('3');
  const [reason, setReason] = useState('');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<any>(null);

  const tier = user?.tier ?? 'BRONZE';
  const terms = TIER_TERMS[tier];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!idFront || !idBack) { setErr(lang === 'fr' ? 'Veuillez télécharger les deux côtés de votre pièce d\'identité.' : 'Please upload both sides of your ID document.'); return; }
    setBusy(true);
    try {
      // Upload ID documents first
      const idFrontUrl = (await uploadApi.upload(idFront)).url;
      const idBackUrl = (await uploadApi.upload(idBack)).url;
      const res = await borrowApi.money({
        amount: parseFloat(amount),
        currency: 'XAF',
        duration_months: parseInt(duration),
        reason: reason || undefined,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
      });
      setResult(res);
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to submit request');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const waUrl = `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
      `Hello Zender237, I just submitted a borrow money request (Ref: ${result.reference}). Amount: ${fmtMoney(result.amount, result.currency)}, Interest: ${result.interest_rate}%, Duration: ${result.duration_months} months, Due: ${result.due_date ? fmtDate(result.due_date) : 'N/A'}. Please assist.`,
    )}`;
    return (
      <ResultCard title="Borrow money request submitted" reference={result.reference} waUrl={waUrl} waNumber={waNumber} lang={lang}
        details={[
          ['Amount', fmtMoney(result.amount, result.currency)],
          ['Interest rate', `${result.interest_rate}%`],
          ['Duration', `${result.duration_months} months`],
          ['Due date', result.due_date ? fmtDate(result.due_date) : '—'],
          ['Tier', result.is_gold ? 'GOLD benefits applied' : tier],
        ]} onReset={() => { setResult(null); setAmount(''); setReason(''); setIdFront(null); setIdBack(null); }} />
    );
  }

  return (
    <div className="card">
      {err && <div className="alert alert-error"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Amount to borrow (XAF)</label>
          <input className="form-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1000" />
        </div>
        <div className="form-group">
          <label>Duration (months, max {terms.maxMonths})</label>
          <input className="form-input" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" max={terms.maxMonths} required />
        </div>
        <div className="form-group">
          <label>Reason (optional)</label>
          <textarea className="form-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you need this loan?" />
        </div>
        <div className="form-group">
          <label>ID document — front {lang === 'fr' ? '(recto)' : '(required)'}</label>
          <input className="form-input" type="file" accept="image/*" onChange={(e) => setIdFront(e.target.files?.[0] ?? null)} required />
        </div>
        <div className="form-group">
          <label>ID document — back {lang === 'fr' ? '(verso)' : '(required)'}</label>
          <input className="form-input" type="file" accept="image/*" onChange={(e) => setIdBack(e.target.files?.[0] ?? null)} required />
        </div>
        <div className="alert alert-info" style={{ fontSize: 12 }}>
          <i className="fa-solid fa-info-circle" /> Based on your {tier} tier: {terms.interest}% interest, up to {terms.maxMonths} months.
        </div>
        <button className="btn green" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : <>{lang === 'fr' ? 'Soumettre' : 'Submit request'} <i className="fa-solid fa-hand-holding-dollar" /></>}
        </button>
      </form>
    </div>
  );
}

function BorrowTicketForm({ waNumber, lang }: { waNumber: string; lang: 'en' | 'fr' }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<any>(null);

  const isGold = user?.tier === 'GOLD';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      let idFrontUrl: string | undefined;
      let idBackUrl: string | undefined;
      if (idFront) idFrontUrl = (await uploadApi.upload(idFront)).url;
      if (idBack) idBackUrl = (await uploadApi.upload(idBack)).url;
      const res = await borrowApi.flightTicket({
        reason: reason || undefined,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
      });
      setResult(res);
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to submit request');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const waUrl = `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
      `Hello Zender237, I submitted a flight ticket borrow request (Ref: ${result.reference}). ${result.is_gold ? 'I am a GOLD member (1 month free accommodation).' : ''} Please assist with my travel.`,
    )}`;
    return (
      <ResultCard title="Flight ticket request submitted" reference={result.reference} waUrl={waUrl} waNumber={waNumber} lang={lang}
        details={[
          ['GOLD benefits', result.is_gold ? 'Yes — 1 month free accommodation' : 'No'],
          ['Free accommodation', `${result.free_accommodation_months} month(s)`],
          ['Status', result.status],
        ]} onReset={() => { setResult(null); setReason(''); setIdFront(null); setIdBack(null); }} />
    );
  }

  return (
    <div className="card">
      {err && <div className="alert alert-error"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Travel reason / details</label>
          <textarea className="form-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Destination, dates, purpose of travel..." />
        </div>
        <div className="form-group">
          <label>ID card — front</label>
          <input className="form-input" type="file" accept="image/*" onChange={(e) => setIdFront(e.target.files?.[0] ?? null)} />
        </div>
        <div className="form-group">
          <label>ID card — back</label>
          <input className="form-input" type="file" accept="image/*" onChange={(e) => setIdBack(e.target.files?.[0] ?? null)} />
        </div>
        {isGold && <div className="alert alert-success" style={{ fontSize: 12 }}><i className="fa-solid fa-crown" /> GOLD tier: 1 month free accommodation included!</div>}
        <button className="btn amber" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : <>{lang === 'fr' ? 'Soumettre' : 'Submit request'} <i className="fa-solid fa-plane" /></>}
        </button>
      </form>
    </div>
  );
}

function ResultCard({ title, reference, details, waUrl, waNumber, lang, onReset }: {
  title: string; reference: string; details: [string, string][]; waUrl: string; waNumber: string; lang: 'en' | 'fr'; onReset: () => void;
}) {
  return (
    <>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44, color: 'var(--green)', marginBottom: 10 }}><i className="fa-solid fa-circle-check" /></div>
        <h3>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '6px 0 16px' }}>Ref: {reference}</p>
        {details.map(([k, v]) => (
          <div key={k} className="toggle-row" style={{ fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="wa-banner">
        <i className="fa-brands fa-whatsapp" />
        <h3>{lang === 'fr' ? 'Contactez-nous sur WhatsApp' : 'Contact us on WhatsApp'}</h3>
        <p>{lang === 'fr' ? 'Pour finaliser votre demande, contactez notre équipe.' : 'To finalize your request, contact our team.'}</p>
        <a href={waUrl} target="_blank" rel="noopener noreferrer">
          <i className="fa-brands fa-whatsapp" /> {waNumber}
        </a>
      </div>
      <button className="btn outline" onClick={onReset}>{lang === 'fr' ? 'Nouvelle demande' : 'New request'}</button>
    </>
  );
}
