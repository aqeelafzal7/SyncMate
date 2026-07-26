import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Copy, 
  Check, 
  User, 
  Calendar, 
  CreditCard, 
  Tag, 
  Send, 
  Phone, 
  Sparkles, 
  Receipt,
  Building2,
  Wallet
} from 'lucide-react';
import { calculateExpirationDate } from '../lib/subscriptionService';
import { getAllUsersFromFirestore } from '../lib/firebase';
import { UserProfile } from '../types';

interface PkrInvoiceCalculatorProps {
  initialGmail?: string;
  initialPlan?: 'spark' | 'premium' | 'extra_premium' | string;
}

export const PkrInvoiceCalculator: React.FC<PkrInvoiceCalculatorProps> = ({
  initialGmail = '',
  initialPlan = 'premium'
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clientGmail, setClientGmail] = useState<string>(initialGmail);
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);
  const [customPrice, setCustomPrice] = useState<number>(2500);
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [discountPkr, setDiscountPkr] = useState<number>(0);
  const [jazzCashAccount, setJazzCashAccount] = useState<string>('0300-1234567 (SyncMate Official)');
  const [sadaPayAccount, setSadaPayAccount] = useState<string>('0300-1234567 (SyncMate)');
  const [bankIban, setBankIban] = useState<string>('PK36SCBL0000001123456701');

  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    getAllUsersFromFirestore()
      .then(fetchedUsers => setUsers(fetchedUsers))
      .catch(err => console.warn('Failed to load users for invoice calculator:', err));
  }, []);

  useEffect(() => {
    if (initialGmail) setClientGmail(initialGmail);
    if (initialPlan) setSelectedPlan(initialPlan);
  }, [initialGmail, initialPlan]);

  // Calculate Base Price
  const getBasePrice = () => {
    if (selectedPlan === 'spark') return 399;
    if (selectedPlan === 'premium') return 1299;
    if (selectedPlan === 'extra_premium' || selectedPlan === 'custom') return customPrice;
    return 1299;
  };

  const getPlanName = () => {
    if (selectedPlan === 'spark') return 'Spark Plan';
    if (selectedPlan === 'premium') return 'Premium Member';
    if (selectedPlan === 'extra_premium' || selectedPlan === 'custom') return 'Extra Premium / Custom Plan';
    return selectedPlan;
  };

  const subtotal = getBasePrice() * durationMonths;
  const totalPkrAmount = Math.max(0, subtotal - discountPkr);

  // Expiration Date calculation
  const expirationIso = calculateExpirationDate(durationMonths);
  const formattedEndDate = new Date(expirationIso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Generated WhatsApp Voucher Text
  const generatedReceiptText = `🧾 *SYNCMATE OFFICIAL PAYMENT INVOICE*
─────────────────────────────
*Client:* ${clientGmail || 'Valued Member'}
*Plan:* ${getPlanName()}
*Duration:* ${durationMonths} Month(s)
*Valid Until:* ${formattedEndDate} (23:59:59 Midnight)

*Total Amount:* ₨ ${totalPkrAmount.toLocaleString()} PKR
─────────────────────────────
*PAYMENT METHODS:*
• JazzCash / EasyPaisa: ${jazzCashAccount}
• SadaPay / NayaPay: ${sadaPayAccount}
• Bank Transfer IBAN: ${bankIban}
─────────────────────────────
Please reply with your payment screenshot to activate your account instantly!`;

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(generatedReceiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">
            PKR Payment Voucher & Invoice Calculator
          </h2>
          <p className="text-xs text-slate-400">
            Generate clean, formatted WhatsApp receipts for local Pakistani payment channels.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Calculator Inputs */}
        <div className="lg:col-span-6 space-y-5">
          {/* Client Gmail */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Client Gmail Address
            </label>
            <div className="relative">
              <input
                type="email"
                list="user-gmails"
                placeholder="client@gmail.com"
                value={clientGmail}
                onChange={(e) => setClientGmail(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
              />
              <datalist id="user-gmails">
                {users.map(u => (
                  <option key={u.uid} value={u.email}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Plan Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Select Plan
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="spark">⚡ Spark Plan — ₨ 399 / mo</option>
              <option value="premium">💎 Premium Member — ₨ 1,299 / mo</option>
              <option value="extra_premium">👑 Custom / Extra Premium Plan</option>
            </select>
          </div>

          {/* Custom Price Input (If Custom selected) */}
          {(selectedPlan === 'extra_premium' || selectedPlan === 'custom') && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-xs font-bold text-slate-300">
                Custom Monthly Rate (PKR)
              </label>
              <input
                type="number"
                min={0}
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Duration Months */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Duration (Months)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationMonths(m)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    durationMonths === m
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {m} {m === 1 ? 'Month' : 'Months'}
                </button>
              ))}
            </div>
          </div>

          {/* Discount Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Discount Amount (PKR)
            </label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 50"
              value={discountPkr || ''}
              onChange={(e) => setDiscountPkr(Number(e.target.value))}
              className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Payment Account Details Editor */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-800 pb-1">
              Payment Gateway Accounts
            </span>
            
            <div className="grid grid-cols-1 gap-2 text-xs">
              <input
                type="text"
                value={jazzCashAccount}
                onChange={(e) => setJazzCashAccount(e.target.value)}
                placeholder="JazzCash / EasyPaisa details"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs"
              />
              <input
                type="text"
                value={sadaPayAccount}
                onChange={(e) => setSadaPayAccount(e.target.value)}
                placeholder="SadaPay / NayaPay details"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs"
              />
              <input
                type="text"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                placeholder="Bank IBAN"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Receipt Preview & Copy Button */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Generated WhatsApp Receipt Preview</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                Total: ₨ {totalPkrAmount.toLocaleString()} PKR
              </span>
            </div>

            {/* Formatted Text Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner selection:bg-emerald-500/30 selection:text-emerald-200">
              {generatedReceiptText}
            </div>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyReceipt}
            className={`w-full py-3.5 px-6 rounded-2xl text-xs font-black shadow-lg transition-all flex items-center justify-center space-x-2 ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copied Receipt to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                <span>Copy Receipt Text for WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
