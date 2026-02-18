import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/layout/Navbar';
import { fetchUserTransactions } from '../lib/transactions';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, Zap } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'];

export function WalletPage() {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await fetchUserTransactions(user.id);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (tx: Transaction) => {
    switch (tx.type) {
      case 'boost':
        return <Zap className="w-5 h-5 text-purple-600" />;
      case 'test_balance':
      case 'deposit':
        return <Plus className="w-5 h-5 text-green-600" />;
      case 'purchase':
        return <ArrowUpRight className="w-5 h-5 text-red-600" />;
      case 'withdrawal':
        return <ArrowDownLeft className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTransactionLabel = (tx: Transaction) => {
    switch (tx.type) {
      case 'boost':
        return 'İlan Boost';
      case 'test_balance':
        return 'Test Bakiyesi';
      case 'deposit':
        return 'Para Yatırma';
      case 'purchase':
        return 'Satın Alma';
      case 'withdrawal':
        return 'Para Çekme';
      default:
        return tx.type;
    }
  };

  const getTransactionAmount = (tx: Transaction) => {
    const isPositive = tx.amount >= 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const sign = isPositive ? '+' : '';
    return (
      <span className={`font-bold text-lg ${color}`}>
        {sign}${Math.abs(tx.amount).toFixed(2)}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600">Cüzdanınızı görüntülemek için giriş yapın</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Balance Card */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-[2rem] shadow-sm p-8 text-white mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-6 h-6" />
                  <span className="text-lg opacity-90">Mevcut Bakiye</span>
                </div>
                <p className="text-5xl font-bold">${profile?.balance?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 p-6">
            <h3 className="text-2xl font-bold mb-6 text-[#1a1a1a]">İşlem Geçmişi</h3>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">İşlemler yükleniyor...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 text-lg">Henüz işlem yok</p>
                <p className="text-gray-500 text-sm mt-2">İlk işleminiz burada görünecek</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-[1.5rem] hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-gray-100 rounded-[1rem]">
                        {getTransactionIcon(tx)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{getTransactionLabel(tx)}</p>
                        {tx.description && (
                          <p className="text-sm text-gray-600 mt-0.5">{tx.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(tx.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getTransactionAmount(tx)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
