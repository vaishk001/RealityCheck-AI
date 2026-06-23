import { BriefcaseBusiness, Coins, GraduationCap, KeyRound, MailWarning, QrCode } from 'lucide-react';

const templates = [
  {
    id: 'job',
    label: 'Fake Job Offer',
    icon: BriefcaseBusiness,
    value:
      'Hi! We reviewed your profile and you are shortlisted. Earn $1000/day working from home. Limited time! Reply with your email and phone to proceed.'
  },
  {
    id: 'internship',
    label: 'Internship Scam',
    icon: GraduationCap,
    value:
      'Congratulations! You are selected for a remote internship. Pay a small registration fee today to confirm your slot. Submit your Aadhaar/ID and bank details for stipend processing.'
  },
  {
    id: 'otp',
    label: 'OTP Scam',
    icon: KeyRound,
    value:
      'URGENT: Your bank account will be locked. Share the OTP we just sent to verify your identity and keep your account active.'
  },
  {
    id: 'upi',
    label: 'UPI / QR Scam',
    icon: QrCode,
    value:
      'You will receive a refund today. Please scan this QR / approve the UPI collect request to get money. Do it now to avoid cancellation.'
  },
  {
    id: 'phish',
    label: 'Phishing Message',
    icon: MailWarning,
    value:
      'Security alert: Unusual sign-in detected. Verify your account immediately: https://login.secure-account.example.xyz/verify'
  },
  {
    id: 'crypto',
    label: 'Crypto Scam',
    icon: Coins,
    value:
      'We found a wallet eligible for an airdrop. Connect your wallet now to claim rewards. Limited spots. Use this link to verify and sign the transaction.'
  }
];

export default function QuickTemplates({ onPick }) {
  return (
    <div className="rounded-2xl bg-slate-900/40 ring-1 ring-slate-700/40 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-200">Quick Test Templates</h3>
        <div className="text-xs text-slate-500">Autofill realistic examples</div>
      </div>
      <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t.value)}
            className="group rounded-xl bg-slate-950/40 px-4 py-3 text-left ring-1 ring-slate-700/40 transition hover:ring-slate-600/60 hover:bg-slate-950/55"
          >
            <div className="flex items-center gap-2">
              <t.icon className="h-4 w-4 text-cyan-300 transition group-hover:text-cyan-200" />
              <div className="text-sm font-semibold text-slate-200">{t.label}</div>
            </div>
            <div className="mt-2 line-clamp-2 text-xs text-slate-400">{t.value}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
