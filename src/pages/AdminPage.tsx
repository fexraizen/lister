import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { supabase } from '../lib/supabase';
import { Shield, Users, Store, X, Edit, CheckCircle2, Ban, Trash2, UserCog, ScrollText, DollarSign } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Shop = Database['public']['Tables']['shops']['Row'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

type TabType = 'users' | 'shops' | 'activity' | 'financial';

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

export function AdminPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [financialFilter, setFinancialFilter] = useState<'all' | 'expenses' | 'deposits'>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Modals
  const [editingBalance, setEditingBalance] = useState<{ userId: string; username: string; currentBalance: number } | null>(null);
  const [editingShopName, setEditingShopName] = useState<{ shopId: string; currentName: string } | null>(null);
  const [editingRole, setEditingRole] = useState<{ userId: string; username: string; currentRole: string } | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [newShopNameInput, setNewShopNameInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState<'user' | 'moderator' | 'admin' | 'super_admin'>('user');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!profile?.is_admin && profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      navigate('/');
      return;
    }

    loadData();
  }, [user, profile, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData);

      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      if (shopsError) throw shopsError;
      setShops(shopsData);

      // Load activity logs
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;
      setActivityLogs(logsData || []);

      // Load transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      showToast(`Kullanıcı ${!currentStatus ? 'onaylandı' : 'onayı kaldırıldı'}!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız', 'error');
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      showToast(`Kullanıcı ${!currentStatus ? 'banlandı' : 'ban kaldırıldı'}!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız', 'error');
    }
  };

  const handleEditRole = (userId: string, username: string, currentRole: string) => {
    setEditingRole({ userId, username, currentRole });
    setNewRoleInput(currentRole as any);
  };

  const submitRoleEdit = async () => {
    if (!editingRole || !user) return;
    
    // Only super_admin and admin can change roles
    if (profile?.role !== 'super_admin' && profile?.role !== 'admin') {
      showToast('Sadece Admin veya Super Admin rol değiştirebilir', 'error');
      return;
    }

    // Only super_admin can assign super_admin role
    if (newRoleInput === 'super_admin' && profile?.role !== 'super_admin') {
      showToast('Sadece Super Admin, Super Admin rolü atayabilir', 'error');
      return;
    }

    try {
      const { error } = await supabase.rpc('update_user_role', {
        p_user_id: editingRole.userId,
        p_new_role: newRoleInput,
        p_admin_id: user.id
      });

      // If there's an error, throw it
      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      // No error means success!
      showToast('Rol başarıyla güncellendi!', 'success');
      setEditingRole(null);
      loadData(); // Refresh user list
    } catch (err: any) {
      console.error('Role update error:', err);
      showToast(err.message || 'Rol güncellenemedi', 'error');
    }
  };

  const handleEditBalance = (userId: string, username: string, currentBalance: number) => {
    setEditingBalance({ userId, username, currentBalance });
    setNewBalanceInput(currentBalance.toString());
  };

  const submitBalanceEdit = async () => {
    if (!editingBalance) return;
    
    const newBalance = parseFloat(newBalanceInput);
    if (isNaN(newBalance) || newBalance < 0) {
      showToast('Geçerli bir bakiye girin', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', editingBalance.userId);

      if (error) throw error;
      showToast('Bakiye güncellendi!', 'success');
      setEditingBalance(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Bakiye güncellenemedi', 'error');
    }
  };

  const handleToggleShopVerification = async (shopId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('shops')
        .update({ is_verified: !currentStatus })
        .eq('id', shopId);

      if (error) throw error;
      showToast(`Mağaza ${!currentStatus ? 'onaylandı' : 'onayı kaldırıldı'}!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız', 'error');
    }
  };

  const handleShopStatusChange = async (shopId: string, newStatus: 'active' | 'passive' | 'banned') => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('update_shop_status', {
        p_shop_id: shopId,
        p_new_status: newStatus,
        p_admin_id: user.id
      });

      // If there's an error, throw it
      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      // No error means success!
      const statusMessages = {
        active: 'Mağaza aktif duruma getirildi',
        passive: 'Mağaza pasif duruma getirildi (Tatil Modu)',
        banned: 'Mağaza kapatıldı'
      };
      showToast(statusMessages[newStatus], 'success');
      loadData(); // Refresh shop list
    } catch (err: any) {
      console.error('Shop status update error:', err);
      showToast(err.message || 'Durum güncellenemedi', 'error');
    }
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (!user) return;

    // Only super_admin can delete shops
    if (profile?.role !== 'super_admin') {
      showToast('Sadece Super Admin mağaza silebilir', 'error');
      return;
    }

    if (!confirm(`"${shopName}" mağazasını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_shop_permanently', {
        p_shop_id: shopId,
        p_admin_id: user.id
      });

      // If there's an error, throw it
      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      // No error means success!
      showToast('Mağaza kalıcı olarak silindi', 'success');
      loadData(); // Refresh shop list
    } catch (err: any) {
      console.error('Shop delete error:', err);
      showToast(err.message || 'Mağaza silinemedi', 'error');
    }
  };

  const handleEditShopName = (shopId: string, currentName: string) => {
    setEditingShopName({ shopId, currentName });
    setNewShopNameInput(currentName);
  };

  const submitShopNameEdit = async () => {
    if (!editingShopName) return;
    if (!newShopNameInput || newShopNameInput === editingShopName.currentName) {
      setEditingShopName(null);
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('shops')
        .select('id')
        .eq('name', newShopNameInput)
        .neq('id', editingShopName.shopId)
        .single();

      if (existing) {
        showToast('Bu mağaza adı zaten kullanılıyor!', 'error');
        return;
      }

      const { error } = await supabase
        .from('shops')
        .update({ name: newShopNameInput })
        .eq('id', editingShopName.shopId);

      if (error) throw error;
      showToast('Mağaza adı güncellendi!', 'success');
      setEditingShopName(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Mağaza adı güncellenemedi', 'error');
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      super_admin: { text: 'Super Admin', color: 'bg-red-100 text-red-700' },
      admin: { text: 'Admin', color: 'bg-purple-100 text-purple-700' },
      moderator: { text: 'Moderatör', color: 'bg-blue-100 text-blue-700' },
      user: { text: 'Kullanıcı', color: 'bg-gray-100 text-gray-700' }
    };
    return badges[role as keyof typeof badges] || badges.user;
  };

  const getShopStatusBadge = (status: string) => {
    const badges = {
      active: { text: 'Aktif', color: 'bg-green-100 text-green-700' },
      passive: { text: 'Pasif', color: 'bg-yellow-100 text-yellow-700' },
      banned: { text: 'Kapalı', color: 'bg-red-100 text-red-700' }
    };
    return badges[status as keyof typeof badges] || badges.active;
  };

  if (!profile?.is_admin && profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yönetim paneli yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] ${
              toast.type === 'success' ? 'bg-green-600 text-white' :
              toast.type === 'error' ? 'bg-red-600 text-white' :
              'bg-blue-600 text-white'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Role Edit Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Rol Düzenle: {editingRole.username}</h3>
            <p className="text-sm text-gray-600 mb-4">Mevcut rol: {getRoleBadge(editingRole.currentRole).text}</p>
            <select
              value={newRoleInput}
              onChange={(e) => setNewRoleInput(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            >
              <option value="user">Kullanıcı</option>
              <option value="moderator">Moderatör</option>
              <option value="admin">Admin</option>
              <option value="super_admin" disabled={profile?.role !== 'super_admin'}>
                Super Admin {profile?.role !== 'super_admin' ? '(Sadece Super Admin atayabilir)' : ''}
              </option>
            </select>
            {profile?.role !== 'super_admin' && (
              <p className="text-xs text-amber-600 mb-4">
                ⚠️ Not: Sadece Super Admin, Super Admin rolü atayabilir
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={submitRoleEdit}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Kaydet
              </button>
              <button
                onClick={() => setEditingRole(null)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Edit Modal */}
      {editingBalance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Bakiye Düzenle: {editingBalance.username}</h3>
            <p className="text-sm text-gray-600 mb-4">Mevcut bakiye: ${editingBalance.currentBalance.toFixed(2)}</p>
            <input
              type="number"
              value={newBalanceInput}
              onChange={(e) => setNewBalanceInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              placeholder="Yeni bakiye"
              step="0.01"
            />
            <div className="flex gap-2">
              <button
                onClick={submitBalanceEdit}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Kaydet
              </button>
              <button
                onClick={() => setEditingBalance(null)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Name Edit Modal */}
      {editingShopName && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Mağaza Adını Düzenle</h3>
            <p className="text-sm text-gray-600 mb-4">Mevcut ad: {editingShopName.currentName}</p>
            <input
              type="text"
              value={newShopNameInput}
              onChange={(e) => setNewShopNameInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              placeholder="Yeni mağaza adı"
            />
            <div className="flex gap-2">
              <button
                onClick={submitShopNameEdit}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Kaydet
              </button>
              <button
                onClick={() => setEditingShopName(null)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Yönetim Paneli</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Toplam Kullanıcı</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Toplam Mağaza</p>
                <p className="text-3xl font-bold text-gray-900">{shops.length}</p>
              </div>
              <Store className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Onaylı Kullanıcılar</p>
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(u => u.is_verified).length}
                </p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Banlı Kullanıcılar</p>
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(u => u.is_banned).length}
                </p>
              </div>
              <Ban className="w-12 h-12 text-red-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Kullanıcılar</span>
            </button>
            <button
              onClick={() => setActiveTab('shops')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'shops'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Store className="w-5 h-5" />
              <span>Mağazalar</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'activity'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ScrollText className="w-5 h-5" />
              <span>📜 Aktivite Logları</span>
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'financial'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span>💰 Finansal Geçmiş</span>
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'users' ? (
              <div>
                <h2 className="text-xl font-bold mb-4">Kullanıcı Yönetimi</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">Kullanıcı Adı</th>
                        <th className="text-left py-3 px-4">Rol</th>
                        <th className="text-left py-3 px-4">Bakiye</th>
                        <th className="text-left py-3 px-4">Onaylı</th>
                        <th className="text-left py-3 px-4">Banlı</th>
                        <th className="text-left py-3 px-4">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const roleBadge = getRoleBadge(u.role);
                        return (
                          <tr 
                            key={u.id} 
                            className={`border-b border-gray-100 hover:bg-gray-50 ${
                              u.is_banned ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-medium">{u.username}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleBadge.color}`}>
                                {roleBadge.text}
                              </span>
                            </td>
                            <td className="py-3 px-4">${u.balance.toFixed(2)}</td>
                            <td className="py-3 px-4">
                              {u.is_verified ? (
                                <span className="text-green-600 font-bold">✓</span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {u.is_banned ? (
                                <span className="text-red-600 font-bold">✓</span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
                                  <button
                                    onClick={() => handleEditRole(u.id, u.username, u.role)}
                                    className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                                    title="Rol Ata"
                                  >
                                    <UserCog className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditBalance(u.id, u.username, u.balance)}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Bakiyeyi Düzenle"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleVerification(u.id, u.is_verified)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    u.is_verified
                                      ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                                  }`}
                                  title={u.is_verified ? 'Onayı Kaldır' : 'Onayla'}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleBan(u.id, u.is_banned)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    u.is_banned
                                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  }`}
                                  title={u.is_banned ? 'Ban Kaldır' : 'Banla'}
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'shops' ? (
              <div>
                <h2 className="text-xl font-bold mb-4">Mağaza Yönetimi</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">Mağaza Adı</th>
                        <th className="text-left py-3 px-4">Durum</th>
                        <th className="text-left py-3 px-4">Onaylı</th>
                        <th className="text-left py-3 px-4">Oluşturulma</th>
                        <th className="text-left py-3 px-4">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shops.map((shop) => {
                        const statusBadge = getShopStatusBadge(shop.status || 'active');
                        return (
                          <tr 
                            key={shop.id} 
                            className={`border-b border-gray-100 hover:bg-gray-50 ${
                              shop.status === 'banned' ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-medium">{shop.name}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                                {statusBadge.text}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {shop.is_verified ? (
                                <span className="text-green-600 font-bold">✓</span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(shop.created_at).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => handleEditShopName(shop.id, shop.name)}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Adını Değiştir"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleShopVerification(shop.id, shop.is_verified)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    shop.is_verified
                                      ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                                  }`}
                                  title={shop.is_verified ? 'Onayı Kaldır' : 'Onayla'}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleShopStatusChange(shop.id, 'active')}
                                  disabled={shop.status === 'active'}
                                  className="px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-xs font-semibold disabled:opacity-50"
                                  title="Aktife Al"
                                >
                                  🟢 Aktif
                                </button>
                                <button
                                  onClick={() => handleShopStatusChange(shop.id, 'passive')}
                                  disabled={shop.status === 'passive'}
                                  className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors text-xs font-semibold disabled:opacity-50"
                                  title="Pasife Al (Tatil Modu)"
                                >
                                  🟡 Pasif
                                </button>
                                <button
                                  onClick={() => handleShopStatusChange(shop.id, 'banned')}
                                  disabled={shop.status === 'banned'}
                                  className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-semibold disabled:opacity-50"
                                  title="Kapat (Banned)"
                                >
                                  🔴 Kapat
                                </button>
                                {profile?.role === 'super_admin' && (
                                  <button
                                    onClick={() => handleDeleteShop(shop.id, shop.name)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    title="Kalıcı Olarak Sil"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'activity' ? (
              <div>
                <h2 className="text-xl font-bold mb-4">📜 Aktivite Logları</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Sistemdeki tüm kullanıcı aktivitelerini buradan takip edebilirsiniz.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">Kullanıcı</th>
                        <th className="text-left py-3 px-4">İşlem</th>
                        <th className="text-left py-3 px-4">Detay</th>
                        <th className="text-left py-3 px-4">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">
                            Henüz aktivite kaydı bulunmuyor
                          </td>
                        </tr>
                      ) : (
                        activityLogs.map((log) => {
                          const user = users.find(u => u.id === log.user_id);
                          return (
                            <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">
                                {user?.username || 'Bilinmeyen Kullanıcı'}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {log.details ? (
                                  <pre className="text-xs bg-gray-50 p-2 rounded max-w-md overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {new Date(log.created_at).toLocaleString('tr-TR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'financial' ? (
              <div>
                <h2 className="text-xl font-bold mb-4">💰 Finansal Geçmiş</h2>
                
                {/* Filter Buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setFinancialFilter('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      financialFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Tümü
                  </button>
                  <button
                    onClick={() => setFinancialFilter('expenses')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      financialFilter === 'expenses'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Harcamalar
                  </button>
                  <button
                    onClick={() => setFinancialFilter('deposits')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      financialFilter === 'deposits'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Bakiye Yüklemeleri
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">Kullanıcı</th>
                        <th className="text-left py-3 px-4">Tip</th>
                        <th className="text-left py-3 px-4">Miktar</th>
                        <th className="text-left py-3 px-4">Açıklama</th>
                        <th className="text-left py-3 px-4">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let filteredTransactions = transactions;
                        
                        if (financialFilter === 'expenses') {
                          filteredTransactions = transactions.filter(t => 
                            t.type === 'boost_expense' || t.type === 'listing_fee' || t.type === 'purchase'
                          );
                        } else if (financialFilter === 'deposits') {
                          filteredTransactions = transactions.filter(t => 
                            t.type === 'deposit' || t.type === 'test_balance'
                          );
                        }

                        if (filteredTransactions.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-gray-500">
                                {financialFilter === 'all' 
                                  ? 'Henüz işlem kaydı bulunmuyor'
                                  : financialFilter === 'expenses'
                                  ? 'Henüz harcama kaydı bulunmuyor'
                                  : 'Henüz bakiye yükleme kaydı bulunmuyor'
                                }
                              </td>
                            </tr>
                          );
                        }

                        return filteredTransactions.map((transaction) => {
                          const user = users.find(u => u.id === transaction.user_id);
                          const isExpense = transaction.type === 'boost_expense' || 
                                          transaction.type === 'listing_fee' || 
                                          transaction.type === 'purchase' ||
                                          transaction.amount < 0;
                          const isDeposit = transaction.type === 'deposit' || 
                                          transaction.type === 'test_balance' ||
                                          transaction.amount > 0;

                          const typeLabels: Record<string, string> = {
                            boost_expense: 'Boost Harcaması',
                            listing_fee: 'İlan Ücreti',
                            purchase: 'Satın Alma',
                            deposit: 'Bakiye Yükleme',
                            test_balance: 'Test Bakiyesi',
                            boost: 'Boost',
                            withdrawal: 'Para Çekme'
                          };

                          return (
                            <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">
                                {user?.username || 'Bilinmeyen Kullanıcı'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  isExpense 
                                    ? 'bg-red-100 text-red-700' 
                                    : isDeposit
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {typeLabels[transaction.type] || transaction.type}
                                </span>
                              </td>
                              <td className={`py-3 px-4 font-bold ${
                                isExpense ? 'text-red-600' : isDeposit ? 'text-green-600' : 'text-gray-900'
                              }`}>
                                {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {transaction.description || '-'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {new Date(transaction.created_at).toLocaleString('tr-TR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
