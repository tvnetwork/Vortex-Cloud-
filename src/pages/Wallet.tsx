import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  ArrowUpRight, 
  CheckCircle2,
  Receipt
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (!user) return;

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
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: amt,
        type: 'deposit',
        description: 'Add Funds via Stripe',
        createdAt: serverTimestamp()
      });

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Billing</h1>
          <p className="text-sm text-text-secondary">Manage your account balance and billing history.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm"
        >
          <CreditCard className="h-4 w-4" />
          Add Funds
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="border border-border rounded-[var(--radius-card)] p-6 bg-background">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Current Balance</h3>
            <div className="text-4xl font-semibold text-text-primary tracking-tight mb-6">
              ${profile?.balance?.toFixed(2) || '0.00'}
            </div>
            
            <div className="space-y-3 pt-6 border-t border-border text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Plan</span>
                <span className="text-text-primary font-medium">Pay as you go</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Limits</span>
                <span className="text-text-primary font-medium">Unlimited</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="border border-border rounded-[var(--radius-card)] bg-background overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-surface flex items-center gap-2">
              <Receipt className="h-4 w-4 text-text-secondary" />
              <h3 className="text-sm font-medium text-text-primary">Transaction History</h3>
            </div>
            
            <div className="divide-y divide-zinc-800">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted">Loading history...</div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">No transactions found.</div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-card/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{tx.description}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {tx.createdAt ? new Date(tx.createdAt.seconds * 1000).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium text-text-primary">
                      {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-[var(--radius-card)] p-6 max-w-md w-full shadow-2xl relative">
            {successMsg ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
                <h3 className="text-lg font-medium text-text-primary">Funds Added</h3>
                <p className="text-sm text-text-secondary">Your balance has been successfully updated.</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-medium text-text-primary mb-2">Add Funds</h2>
                <p className="text-sm text-text-secondary mb-6">Enter the amount you wish to add to your balance.</p>

                <form onSubmit={handleDeposit} className="space-y-6">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                    <input
                      type="number"
                      required
                      min="5"
                      step="1"
                      placeholder="20"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full bg-background border border-border rounded-md pl-8 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-border hover:bg-card text-text-primary rounded-md text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-primary text-text-primary hover:bg-secondary hover:bg-zinc-200 disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {isSubmitting ? 'Processing...' : 'Pay'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
