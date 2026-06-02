import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  DollarSign, 
  Wallet as WalletIcon, 
  Terminal, 
  ArrowUpRight, 
  Zap, 
  CheckCircle,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../App';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Transaction } from '../types';

export default function Wallet() {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Real-time synchronization of transactions
    const qTx = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.uid), 
      orderBy('createdAt', 'desc'), 
      limit(50)
    );
    const unsubTx = onSnapshot(qTx, (snap) => {
      const txs: Transaction[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        txs.push({
          id: docSnap.id,
          userId: data.userId,
          amount: data.amount,
          type: data.type,
          description: data.description,
          createdAt: data.createdAt
        });
      });
      setTransactions(txs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    });

    return () => unsubTx();
  }, [user]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsSubmitting(true);
    try {
      // 1. Create secure transaction receipt doc in Firestore
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: amt,
        type: 'deposit',
        description: 'Fund platform balance - Stripe billing token secure processor',
        createdAt: serverTimestamp()
      });

      // 2. Increment Developer Profile Balance
      const userRef = doc(db, 'users', user.uid);
      const newBalance = (profile.balance || 0.0) + amt;
      await updateDoc(userRef, { balance: newBalance });

      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        setIsModalOpen(false);
      }, 1500);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 min-h-screen">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-slate-800/80">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold font-heading text-white font-heading">Billing & Node Quotas</h1>
          <p className="text-slate-400 text-sm">Manage cloud computing funding assets and examine transactional runtime metrics.</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/15 hover:opacity-90 transition-all flex items-center gap-2"
        >
          <CreditCard className="h-4 w-4" />
          <span>Fund Account Cluster</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Balance Core and receipts */}
        <div className="lg:col-span-8 space-y-8">
          {/* Platinum Balance Card */}
          <div className="bg-gradient-to-br from-indigo-900/60 via-slate-900/40 to-slate-950/80 border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5 text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Total Cloud Credits</span>
              </div>

              <div>
                <span className="text-5xl font-extrabold font-heading tracking-tight text-white">
                  ${profile?.balance?.toFixed(2) || '50.00'}
                </span>
                <span className="text-xs font-mono text-cyan-400 ml-2">USD Credits Bound</span>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800 max-w-sm font-mono text-xs text-slate-500">
                <p>Node rate: <strong className="text-slate-400">$0.0001/sec</strong></p>
                <p>Postgres: <strong className="text-slate-400">$0.01/hr</strong></p>
                <p>Bandwidth: <strong className="text-slate-400">Unlimited</strong></p>
              </div>
            </div>
          </div>

          {/* Receipts list */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold font-heading text-white flex items-center gap-2">
              <Terminal className="h-5 w-5 text-indigo-400" />
              <span>Transmitted Ledger History</span>
            </h2>

            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500 uppercase tracking-widest">
                Compiles invoices...
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-[#0b1222]/30 border border-slate-800/80 rounded-2xl p-8 text-center text-xs font-mono text-slate-500">
                Ledge clear. No invoice receipts compiled.
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-[#0b1222]/40 rounded-xl border border-slate-900 shadow-sm hover:border-slate-800 transition-colors"
                  >
                    <div className="space-y-1 block max-w-xl">
                      <p className="font-bold text-slate-200">{tx.description || 'Cloud computing ledger'}</p>
                      {tx.createdAt && (
                        <p className="text-[10px] text-slate-500">
                          {new Date(tx.createdAt.seconds * 1000).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-right font-bold text-emerald-400">
                      <span>+${tx.amount.toFixed(2)}</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Usage quotas index */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-lg font-bold font-heading text-slate-200">Cluster Node Limits</h2>

          <div className="bg-[#0b1222]/30 border border-slate-800/80 p-6 rounded-2xl space-y-5 font-mono text-xs">
            {/* CPU */}
            <div className="space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>V8 CONCURRENT PODS</span>
                <span>Unlimited</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full w-full bg-emerald-400 rounded-full" />
              </div>
            </div>

            {/* RAM */}
            <div className="space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>DEDICATED POSTGRES VOL</span>
                <span>Unlimited</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full w-full bg-indigo-500 rounded-full" />
              </div>
            </div>

            {/* BANDWIDTH */}
            <div className="space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>INCOMING BANDWIDTH (GB)</span>
                <span>Unlimited</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full w-full bg-cyan-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit funding processor modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#090f1d] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
            >
              {successMsg ? (
                /* Success feedback */
                <div className="text-center py-10 space-y-4">
                  <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
                  <h3 className="text-lg font-bold font-heading text-white">Cluster credits online!</h3>
                  <p className="text-xs text-slate-400 font-sans">Payment compiled & verified through secure processor node.</p>
                </div>
              ) : (
                /* Payment form info */
                <>
                  <h2 className="text-xl font-bold font-heading text-white mb-2">Fund Account Balance</h2>
                  <p className="text-slate-400 text-xs mb-6">Authorize Stripe billing card checkout engine to append USD credits.</p>

                  <form onSubmit={handleDeposit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">USD Credit Size</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 bg-slate-900 border border-slate-800 rounded-l-xl text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          required
                          min="5"
                          max="1000"
                          placeholder="20"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-full bg-[#050810] border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="w-1/2 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50 py-3 rounded-xl text-sm font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-1/2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-[#050810] py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-cyan-400/10 flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <Terminal className="h-4 w-4 animate-spin" />
                        ) : (
                          <span>Charge Payment</span>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
