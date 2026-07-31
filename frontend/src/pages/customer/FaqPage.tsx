/**
 * FAQ page — accordion-style frequently asked questions, fully dark-mode compatible.
 */
import { useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import BrandHeader from '../../components/BrandHeader';
import BottomNav from '../../components/BottomNav';

export default function FaqPage() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<number | null>(0);

  const faqs = lang === 'fr' ? [
    { q: 'Comment déposer de l\'argent ?', a: 'Cliquez sur le bouton vert "Dépôt" sur la page d\'accueil. Choisissez le montant, le pays source et le numéro de paiement. Envoyez l\'argent au numéro sélectionné, puis téléchargez votre preuve de paiement.' },
    { q: 'Comment transférer de l\'argent ?', a: 'Cliquez sur "Transfert" (ambre). Indiquez le montant, le pays source, le pays de destination et le numéro du destinataire. Le montant + les frais sont déduits immédiatement de votre solde.' },
    { q: 'Comment retirer de l\'argent ?', a: 'Cliquez sur "Retrait" (rouge). Le montant est déduit de votre solde et la demande est traitée par notre équipe.' },
    { q: 'Quels sont les niveaux (tiers) ?', a: 'BRONZE : 15% d\'intérêt, 6 mois max. SILVER : 10% d\'intérêt, 12 mois max. GOLD : 5% d\'intérêt, 24 mois max + 1 mois d\'hébergement gratuit pour les billets d\'avion.' },
    { q: 'Comment emprunter de l\'argent ?', a: 'Allez dans Finance > Emprunter de l\'argent. Le taux d\'intérêt et la durée dépendent de votre niveau. Après soumission, contactez-nous sur WhatsApp pour finaliser.' },
    { q: 'Comment emprunter un billet d\'avion ?', a: 'Allez dans Finance > Emprunter un billet d\'avion. Téléchargez votre pièce d\'identité (recto/verso) et indiquez la raison du voyage. Les membres GOLD bénéficient d\'1 mois d\'hébergement gratuit.' },
    { q: 'Quelles devises sont supportées ?', a: 'XAF (Franc CFA d\'Afrique Centrale) pour le Cameroun, XOF (Franc CFA d\'Afrique de l\'Ouest) pour le Mali, et GNF (Franc Guinéen) pour la Guinée.' },
    { q: 'Comment passer en mode sombre ?', a: 'Cliquez sur l\'icône soleil/lune dans l\'en-tête pour basculer entre le mode clair et sombre. Votre préférence est sauvegardée.' },
  ] : [
    { q: 'How do I deposit money?', a: 'Tap the green "Deposit" button on the home page. Choose the amount, source country, and payment number. Send money to the selected number, then upload your proof of payment.' },
    { q: 'How do I transfer money?', a: 'Tap "Transfer" (amber). Enter the amount, source country, destination country, and receiver\'s phone. The amount + fees are deducted immediately from your balance.' },
    { q: 'How do I withdraw money?', a: 'Tap "Withdraw" (red). The amount is deducted from your balance and the request is processed by our team.' },
    { q: 'What are the tiers?', a: 'BRONZE: 15% interest, max 6 months. SILVER: 10% interest, max 12 months. GOLD: 5% interest, max 24 months + 1 month free accommodation for flight tickets.' },
    { q: 'How do I borrow money?', a: 'Go to Finance > Borrow Money. The interest rate and duration depend on your tier. After submitting, contact us on WhatsApp to finalize.' },
    { q: 'How do I borrow a flight ticket?', a: 'Go to Finance > Borrow Flight Ticket. Upload your ID card (front/back) and provide your travel reason. GOLD members get 1 month free accommodation.' },
    { q: 'Which currencies are supported?', a: 'XAF (Central African CFA Franc) for Cameroon, XOF (West African CFA Franc) for Mali, and GNF (Guinean Franc) for Guinea.' },
    { q: 'How do I enable dark mode?', a: 'Tap the sun/moon icon in the header to toggle between light and dark mode. Your preference is saved automatically.' },
  ];

  return (
    <div className="app-shell">
      <BrandHeader />
      <div className="page">
        <h1 className="page-title">{t('faq.title')}</h1>
        {faqs.map((f, i) => (
          <div className={`faq-item ${open === i ? 'open' : ''}`} key={i}>
            <div className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
              <span>{f.q}</span>
              <i className="fa-solid fa-chevron-down" />
            </div>
            <div className="faq-a">{f.a}</div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
