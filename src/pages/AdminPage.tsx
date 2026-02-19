import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { supabase } from '../lib/supabase';
import { Shield, Users, Store, X, Edit, CheckCircle2, Ban, Trash2, UserCog, ScrollText, DollarSign, Package, AlertTriangle, Settings, MessageCircle, Clock, TrendingUp } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { sendNotification, NotificationTemplates } from '../lib/notificationService';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Shop = Database['public']['Tables']['shops']['Row'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];
type Listing = Database['public']['Tables']['listings']['Row'] & {
  profiles?: {
    username: string;
  };
};
type Report = Database['public']['Tables']['reports']['Row'] & {
  listing?: {
    title: string;
  };
  reporter?: {
    username: string;
  };
  handler?: {
    username: string;
    role: string;
  };
};

type Ticket = Database['public']['Tables']['tickets']['Row'];

type TabType = 'users' | 'shops' | 'listings' | 'reports' | 'tickets' | 'activity' | 'financial' | 'settings' | 'pricing';

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

export function AdminPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [financialFilter, setFinancialFilter] = useState<'all' | 'expenses' | 'deposits'>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Site Settings State
  const [siteSettings, setSiteSettings] = useState({
    stats_security_rate: '99',
    stats_security_text: 'Güvenli',
    stats_support_title: 'Kesintisiz İletişim',
    stats_approval_title: 'Hızlı Onay',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  // System Pricing Settings State
  const [pricingSettings, setPricingSettings] = useState({
    listing_fee: 10,
    boost_fee_24h: 15,
    boost_fee_7d: 50,
    deposit_bonus_rate: 0,
    global_discount_rate: 0,
  });
  const [pricingLoading, setPricingLoading] = useState(false);
  
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

    // Fetch fresh profile from database to check admin status
    checkAdminAccess();
  }, [user, navigate]);

  const checkAdminAccess = async () => {
    if (!user) return;

    try {
      // Fetch fresh profile data from database
      const { data: freshProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Check if user has admin access
      if (freshProfile?.role !== 'admin' && 
          freshProfile?.role !== 'super_admin' &&
          freshProfile?.role !== 'moderator') {
        navigate('/');
        return;
      }

      // User has access, load data
      loadData();
    } catch (err) {
      console.error('Failed to check admin access:', err);
      navigate('/');
    }
  };

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

      // Load listings with seller info
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:user_id (
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;
      setListings(listingsData as Listing[]);

      // Load reports with listing and reporter info
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(`
          *,
          listing:listing_id (
            title
          ),
          reporter:reporter_id (
            username
          ),
          handler:profiles!reports_handled_by_fkey (
            username,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData as unknown as Report[]);

      // Load tickets (simple query without join)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.error('Supabase Ticket Hatası:', ticketsError?.message, ticketsError?.details, ticketsError);
        throw ticketsError;
      }
      setTickets(ticketsData || []);

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

      // Load site settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings' as any)
        .select('key, value');

      if (!settingsError && settingsData) {
        const settingsObj: any = {};
        (settingsData as any[]).forEach((item: any) => {
          settingsObj[item.key] = item.value;
        });
        setSiteSettings({
          stats_security_rate: settingsObj.stats_security_rate || '99',
          stats_security_text: settingsObj.stats_security_text || 'Güvenli',
          stats_support_title: settingsObj.stats_support_title || 'Kesintisiz İletişim',
          stats_approval_title: settingsObj.stats_approval_title || 'Hızlı Onay',
        });
      }

      // Load system pricing settings
      const { data: pricingData, error: pricingError } = await supabase
        .from('system_settings')
        .select('key, value');

      if (!pricingError && pricingData) {
        const pricingObj: any = {
          listing_fee: 10,
          boost_fee_24h: 15,
          boost_fee_7d: 50,
          deposit_bonus_rate: 0,
          global_discount_rate: 0,
        };
        (pricingData as any[]).forEach((item: any) => {
          if (item.key in pricingObj) {
            pricingObj[item.key] = Number(item.value);
          }
        });
        setPricingSettings(pricingObj);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      setSettingsLoading(true);

      // Update each setting
      const updates = [
        { key: 'stats_security_rate', value: siteSettings.stats_security_rate },
        { key: 'stats_security_text', value: siteSettings.stats_security_text },
        { key: 'stats_support_title', value: siteSettings.stats_support_title },
        { key: 'stats_approval_title', value: siteSettings.stats_approval_title },
      ];

      for (const update of updates) {
        const { error } = await supabase.rpc('update_site_setting' as any, {
          p_key: update.key,
          p_value: JSON.stringify(update.value),
          p_admin_id: user.id
        });

        if (error) throw error;
      }

      showToast('Sistem ayarları başarıyla güncellendi!', 'success');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showToast(err.message || 'Ayarlar kaydedilemedi', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSavePricingSettings = async () => {
    if (!user) return;

    try {
      setPricingLoading(true);

      // Update each pricing setting
      const updates = [
        { key: 'listing_fee', value: pricingSettings.listing_fee },
        { key: 'boost_fee_24h', value: pricingSettings.boost_fee_24h },
        { key: 'boost_fee_7d', value: pricingSettings.boost_fee_7d },
        { key: 'deposit_bonus_rate', value: pricingSettings.deposit_bonus_rate },
        { key: 'global_discount_rate', value: pricingSettings.global_discount_rate },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: update.value })
          .eq('key', update.key);

        if (error) throw error;
      }

      showToast('Fiyatlandırma ayarları başarıyla güncellendi!', 'success');
      
      // Reload data to refresh cache
      await loadData();
    } catch (err: any) {
      console.error('Failed to save pricing settings:', err);
      showToast(err.message || 'Fiyatlandırma ayarları kaydedilemedi', 'error');
    } finally {
      setPricingLoading(false);
    }
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      // Send notification to user
      if (!currentStatus) {
        const notification = NotificationTemplates.accountVerified();
        await sendNotification(userId, notification.title, notification.message);
      }
      
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
      
      // Send notification to user
      if (!currentStatus) {
        const notification = NotificationTemplates.accountBanned();
        await sendNotification(userId, notification.title, notification.message);
      }
      
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

      // Send notification to user
      const roleLabels: Record<string, string> = {
        user: 'Kullanıcı',
        moderator: 'Moderatör',
        admin: 'Admin',
        super_admin: 'Super Admin'
      };
      const notification = NotificationTemplates.roleChanged(roleLabels[newRoleInput] || newRoleInput);
      await sendNotification(editingRole.userId, notification.title, notification.message);

      // No error means success!
      showToast('Rol başarıyla güncellendi!', 'success');
      setEditingRole(null);
      
      // Refresh profile if we updated our own role
      if (editingRole.userId === user.id) {
        await refreshProfile();
      }
      
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
      
      // Send notification to user
      const balanceDiff = newBalance - editingBalance.currentBalance;
      if (balanceDiff > 0) {
        const notification = NotificationTemplates.balanceAdded(balanceDiff);
        await sendNotification(editingBalance.userId, notification.title, notification.message);
      }
      
      showToast('Bakiye güncellendi!', 'success');
      setEditingBalance(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Bakiye güncellenemedi', 'error');
    }
  };

  const handleToggleShopVerification = async (shopId: string, currentStatus: boolean) => {
    try {
      // Get shop details first
      const { data: shop } = await supabase
        .from('shops')
        .select('name, owner_id')
        .eq('id', shopId)
        .single();

      const { error } = await supabase
        .from('shops')
        .update({ is_verified: !currentStatus })
        .eq('id', shopId);

      if (error) throw error;
      
      // Send notification to shop owner
      if (!currentStatus && shop) {
        const notification = NotificationTemplates.shopVerified(shop.name);
        await sendNotification(shop.owner_id, notification.title, notification.message);
      }
      
      showToast(`Mağaza ${!currentStatus ? 'onaylandı' : 'onayı kaldırıldı'}!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız', 'error');
    }
  };

  const handleShopStatusChange = async (shopId: string, newStatus: 'active' | 'passive' | 'banned') => {
    if (!user) return;

    try {
      // Get shop details first
      const { data: shop } = await supabase
        .from('shops')
        .select('name, owner_id')
        .eq('id', shopId)
        .single();

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

      // Send notification to shop owner
      if (shop) {
        const statusLabels: Record<string, string> = {
          active: 'Aktif',
          passive: 'Pasif (Tatil Modu)',
          banned: 'Kapalı'
        };
        const notification = NotificationTemplates.shopStatusChanged(shop.name, statusLabels[newStatus]);
        await sendNotification(shop.owner_id, notification.title, notification.message);
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

  const getListingStatusBadge = (status: string) => {
    const badges = {
      active: { text: 'Aktif', color: 'bg-green-100 text-green-700' },
      passive: { text: 'Pasif', color: 'bg-gray-100 text-gray-700' },
      out_of_stock: { text: 'Tükendi', color: 'bg-orange-100 text-orange-700' }
    };
    return badges[status as keyof typeof badges] || badges.active;
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('Mağaza') || action.includes('Shop')) return '🏪';
    if (action.includes('İlan') || action.includes('Listing')) return '🏷️';
    if (action.includes('Şikayet') || action.includes('Report')) return '⚠️';
    if (action.includes('Boost')) return '🚀';
    if (action.includes('Bakiye') || action.includes('Balance')) return '💰';
    if (action.includes('Rol') || action.includes('Role')) return '👤';
    return '📝';
  };

  const getActivityBadgeColor = (action: string) => {
    if (action.includes('Mağaza') || action.includes('Shop')) return 'bg-purple-100 text-purple-700';
    if (action.includes('İlan') || action.includes('Listing')) return 'bg-blue-100 text-blue-700';
    if (action.includes('Şikayet') || action.includes('Report')) return 'bg-orange-100 text-orange-700';
    if (action.includes('Boost')) return 'bg-green-100 text-green-700';
    if (action.includes('Bakiye') || action.includes('Balance')) return 'bg-emerald-100 text-emerald-700';
    if (action.includes('Rol') || action.includes('Role')) return 'bg-indigo-100 text-indigo-700';
    if (action.includes('Admin')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatLogMessage = (log: ActivityLog, username: string) => {
    const details = log.details as any;
    
    switch (log.action) {
      case 'Admin Şikayet Güncelledi':
        if (details?.listing_title && details?.old_status && details?.new_status) {
          const statusLabels: Record<string, string> = {
            pending: 'Beklemede',
            reviewed: 'İncelendi',
            resolved: 'Çözüldü'
          };
          return `${username}, '${details.listing_title}' ilanı hakkındaki şikayeti '${statusLabels[details.old_status] || details.old_status}' durumundan '${statusLabels[details.new_status] || details.new_status}' durumuna getirdi.`;
        }
        if (details?.old_status && details?.new_status) {
          const statusLabels: Record<string, string> = {
            pending: 'Beklemede',
            reviewed: 'İncelendi',
            resolved: 'Çözüldü'
          };
          return `${username}, bir şikayeti '${statusLabels[details.old_status] || details.old_status}' durumundan '${statusLabels[details.new_status] || details.new_status}' durumuna getirdi.`;
        }
        return `${username}, bir şikayeti güncelledi.`;
      
      case 'Yeni İlan':
      case 'İlan Oluşturuldu':
        if (details?.listing_title && details?.price) {
          return `${username}, '${details.listing_title}' başlıklı ilanı ${details.price} TL fiyatıyla yayına aldı.`;
        }
        if (details?.title && details?.price) {
          return `${username}, '${details.title}' başlıklı ilanı ${details.price} TL fiyatıyla yayına aldı.`;
        }
        return `${username}, yeni bir ilan oluşturdu.`;
      
      case 'Mağaza Oluşturuldu':
        if (details?.shop_name) {
          return `${username}, '${details.shop_name}' isimli mağazasını sektöre kazandırdı.`;
        }
        return `${username}, yeni bir mağaza açtı.`;
      
      case 'İlan Boost Edildi':
        if (details?.listing_title && details?.duration_hours) {
          return `${username}, '${details.listing_title}' ilanını ${details.duration_hours} saat boyunca boost etti.`;
        }
        if (details?.listing_title && details?.cost) {
          return `${username}, '${details.listing_title}' ilanını ${details.cost} TL karşılığında boost etti.`;
        }
        return `${username}, bir ilanı boost etti.`;
      
      case 'İlan Şikayet Edildi':
        if (details?.listing_title && details?.reason) {
          return `${username}, '${details.listing_title}' ilanını '${details.reason}' nedeniyle şikayet etti.`;
        }
        if (details?.reason) {
          return `${username}, bir ilanı '${details.reason}' nedeniyle şikayet etti.`;
        }
        return `${username}, bir ilanı şikayet etti.`;
      
      case 'Bakiye Yüklendi':
      case 'Test Bakiyesi Eklendi':
        if (details?.amount) {
          return `${username}, hesabına ${details.amount} TL tutarında bakiye yükledi.`;
        }
        return `${username}, bakiye yükledi.`;
      
      case 'Boost Harcaması':
        if (details?.amount && details?.listing_title) {
          return `${username}, '${details.listing_title}' ilanı için ${Math.abs(details.amount)} TL boost harcaması yaptı.`;
        }
        if (details?.amount) {
          return `${username}, ${Math.abs(details.amount)} TL boost harcaması yaptı.`;
        }
        return `${username}, boost harcaması yaptı.`;
      
      case 'İlan Ücreti':
        if (details?.amount && details?.listing_title) {
          return `${username}, '${details.listing_title}' ilanı için ${Math.abs(details.amount)} TL ilan ücreti ödedi.`;
        }
        if (details?.amount) {
          return `${username}, ${Math.abs(details.amount)} TL ilan ücreti ödedi.`;
        }
        return `${username}, ilan ücreti ödedi.`;
      
      case 'Finansal İşlem':
        if (details?.amount && details?.type) {
          const typeLabels: Record<string, string> = {
            deposit: 'bakiye yükleme',
            withdrawal: 'para çekme',
            purchase: 'satın alma',
            boost: 'boost',
            listing_fee: 'ilan ücreti'
          };
          return `${username}, hesabına ${Math.abs(details.amount)} TL tutarında ${typeLabels[details.type] || details.type} işlemi gerçekleştirdi.`;
        }
        return `${username}, finansal işlem gerçekleştirdi.`;
      
      case 'Admin İlan Sildi':
        if (details?.listing_title) {
          return `${username}, '${details.listing_title}' ilanını sildi.`;
        }
        return `${username}, bir ilanı sildi.`;
      
      case 'Admin İlan Güncelledi':
        if (details?.listing_title) {
          return `${username}, '${details.listing_title}' ilanını güncelledi.`;
        }
        return `${username}, bir ilanı güncelledi.`;
      
      default:
        // Fallback: Try to extract common fields
        if (details?.listing_title) {
          return `${username}, '${details.listing_title}' ile ilgili ${log.action} işlemi gerçekleştirdi.`;
        }
        if (details?.shop_name) {
          return `${username}, '${details.shop_name}' mağazası ile ilgili ${log.action} işlemi gerçekleştirdi.`;
        }
        return `${username}, ${log.action}`;
    }
  };

  const handleDeleteListing = async (listingId: string, listingTitle: string) => {
    if (!window.confirm(`"${listingTitle}" ilanını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      // Get listing owner first
      const { data: listing } = await supabase
        .from('listings')
        .select('user_id')
        .eq('id', listingId)
        .single();

      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;
      
      // Send notification to listing owner
      if (listing) {
        const notification = NotificationTemplates.listingDeleted(listingTitle);
        await sendNotification(listing.user_id, notification.title, notification.message);
      }
      
      showToast('İlan başarıyla silindi', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'İlan silinemedi', 'error');
    }
  };

  const handleToggleListingStatus = async (listingId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'passive' : 'active';
    
    try {
      const { data, error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listingId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Güncelleme başarısız oldu');
      }

      showToast(`İlan durumu ${newStatus === 'active' ? 'aktif' : 'pasif'} olarak güncellendi`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Durum güncellenemedi', 'error');
    }
  };

  const handleMarkReportReviewed = async (reportId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('reports')
        .update({ 
          status: 'reviewed',
          handled_by: user.id
        })
        .eq('id', reportId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Güncelleme başarısız oldu');
      }

      showToast('Şikayet incelendi olarak işaretlendi', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Durum güncellenemedi', 'error');
    }
  };

  const handleDeleteListingFromReport = async (listingId: string, reportId: string) => {
    if (!user) return;
    
    if (!window.confirm('Bu ilanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      // Delete the listing
      const { error: listingError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (listingError) throw listingError;

      // Mark report as resolved
      const { data, error: reportError } = await supabase
        .from('reports')
        .update({ 
          status: 'resolved', 
          admin_notes: 'İlan silindi',
          handled_by: user.id
        })
        .eq('id', reportId)
        .select();

      if (reportError) throw reportError;
      if (!data || data.length === 0) {
        throw new Error('Şikayet güncelleme başarısız oldu');
      }

      showToast('İlan silindi ve şikayet çözüldü olarak işaretlendi', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'İşlem başarısız', 'error');
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin' && profile?.role !== 'moderator') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Kontrol merkezi yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-[1.5rem] shadow-sm min-w-[300px] ${
              toast.type === 'success' ? 'bg-green-600 text-white' :
              toast.type === 'error' ? 'bg-red-600 text-white' :
              'bg-emerald-600 text-white'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Role Edit Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white border border-gray-200 rounded-[2rem] p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-[#1a1a1a]">Rol Düzenle: {editingRole.username}</h3>
            <p className="text-sm text-gray-600 mb-4">Mevcut rol: {getRoleBadge(editingRole.currentRole).text}</p>
            <select
              value={newRoleInput}
              onChange={(e) => setNewRoleInput(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-[1rem] mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="user">Kullanıcı</option>
              <option value="moderator">Moderatör</option>
              <option value="admin">Admin</option>
              <option value="super_admin" disabled={profile?.role !== 'super_admin'}>
                Super Admin {profile?.role !== 'super_admin' ? '(Sadece Super Admin atayabilir)' : ''}
              </option>
            </select>
            {profile?.role !== 'super_admin' && (
              <p className="text-xs text-orange-600 mb-4">
                ⚠️ Not: Sadece Super Admin, Super Admin rolü atayabilir
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={submitRoleEdit}
                className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-[1.5rem] hover:bg-emerald-700 font-semibold transition-colors"
              >
                Kaydet
              </button>
              <button
                onClick={() => setEditingRole(null)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-[1.5rem] hover:bg-gray-200 font-semibold transition-colors"
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
          <div className="bg-white border border-gray-200 rounded-[2rem] p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-[#1a1a1a]">Bakiye Düzenle: {editingBalance.username}</h3>
            <p className="text-sm text-gray-600 mb-4">Mevcut bakiye: ${editingBalance.currentBalance.toFixed(2)}</p>
            <input
              type="number"
              value={newBalanceInput}
              onChange={(e) => setNewBalanceInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-[1rem] mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Yeni bakiye"
              step="0.01"
            />
            <div className="flex gap-2">
              <button
                onClick={submitBalanceEdit}
                className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-[1.5rem] hover:bg-emerald-700 font-semibold transition-colors"
              >
                Kaydet
              </button>
              <button
                onClick={() => setEditingBalance(null)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-[1.5rem] hover:bg-gray-200 font-semibold transition-colors"
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
          <div className="bg-white border border-gray-200 rounded-[2rem] p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-[#1a1a1a]">Mağaza Adını Düzenle</h3>
            <p className="text-sm text-gray-600 mb-4">Mevcut ad: {editingShopName.currentName}</p>
            <input
              type="text"
              value={newShopNameInput}
              onChange={(e) => setNewShopNameInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-[1rem] mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Yeni mağaza adı"
            />
            <div className="flex gap-2">
              <button
                onClick={submitShopNameEdit}
                className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-[1.5rem] hover:bg-emerald-700 font-semibold transition-colors"
              >
                Kaydet
              </button>
              <button
                onClick={() => setEditingShopName(null)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-[1.5rem] hover:bg-gray-200 font-semibold transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-emerald-600" />
          <h1 className="text-3xl font-bold text-[#1a1a1a]">Kontrol Merkezi</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Toplam Kullanıcı</p>
                <p className="text-3xl font-bold text-[#1a1a1a]">{users.length}</p>
              </div>
              <Users className="w-12 h-12 text-emerald-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Toplam Mağaza</p>
                <p className="text-3xl font-bold text-[#1a1a1a]">{shops.length}</p>
              </div>
              <Store className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Onaylı Kullanıcılar</p>
                <p className="text-3xl font-bold text-[#1a1a1a]">
                  {users.filter(u => u.is_verified).length}
                </p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Banlı Kullanıcılar</p>
                <p className="text-3xl font-bold text-[#1a1a1a]">
                  {users.filter(u => u.is_banned).length}
                </p>
              </div>
              <Ban className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border border-gray-200 rounded-[2rem] mb-8 shadow-sm">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors rounded-t-[2rem] ${
                activeTab === 'users'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-[#1a1a1a]'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Kullanıcılar</span>
            </button>
            <button
              onClick={() => setActiveTab('shops')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors rounded-t-[2rem] ${
                activeTab === 'shops'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-[#1a1a1a]'
              }`}
            >
              <Store className="w-5 h-5" />
              <span>Mağazalar</span>
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors rounded-t-[2rem] ${
                activeTab === 'listings'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-[#1a1a1a]'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>İlanlar</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors rounded-t-[2rem] ${
                activeTab === 'reports'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-[#1a1a1a]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <span>İlan Şikayetleri</span>
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors rounded-t-[2rem] ${
                activeTab === 'tickets'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-[#1a1a1a]'
              }`}
            >
              <ScrollText className="w-5 h-5" />
              <span>Destek Talepleri</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors rounded-t-[2rem] ${
                activeTab === 'activity'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-[#1a1a1a]'
              }`}
            >
              <ScrollText className="w-5 h-5" />
              <span>📜 Aktivite Logları</span>
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors rounded-t-[2rem] ${
                activeTab === 'financial'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-[#1a1a1a]'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span>💰 Finansal Geçmiş</span>
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors rounded-t-[2rem] ${
                activeTab === 'pricing'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-[#1a1a1a]'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>💵 Fiyatlandırma</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors rounded-t-[2rem] ${
                activeTab === 'settings'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-[#1a1a1a]'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>⚙️ Sistem Ayarları</span>
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'users' ? (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#1a1a1a]">Kullanıcı Yönetimi</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 text-gray-700 font-semibold">Kullanıcı Adı</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-semibold">Rol</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-semibold">Bakiye</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-semibold">Onaylı</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-semibold">Banlı</th>
                        <th className="text-left py-3 px-4 text-gray-700 font-semibold">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const roleBadge = getRoleBadge(u.role);
                        return (
                          <tr 
                            key={u.id} 
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              u.is_banned ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-medium text-[#1a1a1a]">{u.username}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleBadge.color}`}>
                                {roleBadge.text}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">${u.balance.toFixed(2)}</td>
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
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                  title="Bakiyeyi Düzenle"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleVerification(u.id, u.is_verified)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    u.is_verified
                                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                <h2 className="text-xl font-bold mb-4 text-[#1a1a1a]">Mağaza Yönetimi</h2>
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
            ) : activeTab === 'listings' ? (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#1a1a1a]">İlan Yönetimi</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">İlan Adı</th>
                        <th className="text-left py-3 px-4">Satıcı</th>
                        <th className="text-left py-3 px-4">Fiyat</th>
                        <th className="text-left py-3 px-4">Durum</th>
                        <th className="text-left py-3 px-4">Oluşturulma</th>
                        <th className="text-left py-3 px-4">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">
                            Henüz ilan bulunmuyor
                          </td>
                        </tr>
                      ) : (
                        listings.map((listing) => {
                          const statusBadge = getListingStatusBadge(listing.status);
                          return (
                            <tr 
                              key={listing.id} 
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 font-medium max-w-xs truncate">
                                {listing.title}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {listing.profiles?.username || 'Bilinmeyen'}
                              </td>
                              <td className="py-3 px-4 font-semibold text-gray-900">
                                ${listing.price.toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                                  {statusBadge.text}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {new Date(listing.created_at).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleToggleListingStatus(listing.id, listing.status)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                      listing.status === 'active'
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                                    title={listing.status === 'active' ? 'Pasife Al' : 'Aktife Al'}
                                  >
                                    {listing.status === 'active' ? '⏸ Pasif Yap' : '▶ Aktif Yap'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteListing(listing.id, listing.title)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    title="Sil"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'reports' ? (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#1a1a1a]">İlan Şikayetleri Yönetimi</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">Şikayet Edilen İlan</th>
                        <th className="text-left py-3 px-4">Şikayet Eden</th>
                        <th className="text-left py-3 px-4">Neden</th>
                        <th className="text-left py-3 px-4">Durum</th>
                        <th className="text-left py-3 px-4">İlgilenen</th>
                        <th className="text-left py-3 px-4">Tarih</th>
                        <th className="text-left py-3 px-4">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500">
                            Henüz şikayet bulunmuyor
                          </td>
                        </tr>
                      ) : (
                        reports.map((report) => {
                          const statusColors = {
                            pending: 'bg-yellow-100 text-yellow-700',
                            reviewed: 'bg-blue-100 text-blue-700',
                            resolved: 'bg-green-100 text-green-700'
                          };
                          const statusLabels = {
                            pending: 'Beklemede',
                            reviewed: 'İncelendi',
                            resolved: 'Çözüldü'
                          };
                          
                          // Get role badge for handler
                          const handlerRoleBadge = report.handler?.role ? getRoleBadge(report.handler.role) : null;
                          
                          return (
                            <tr 
                              key={report.id} 
                              className={`border-b border-gray-100 hover:bg-gray-50 ${
                                report.status === 'pending' ? 'bg-yellow-50/30' : ''
                              }`}
                            >
                              <td className="py-3 px-4 font-medium max-w-xs">
                                {report.listing?.title ? (
                                  <a
                                    href={`/listing/${report.listing_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                    title={report.listing.title}
                                  >
                                    {report.listing.title}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">İlan Silinmiş</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {report.reporter?.username || 'Bilinmeyen'}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                                  {report.reason}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[report.status]}`}>
                                  {statusLabels[report.status]}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {report.handler?.username ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold inline-flex items-center gap-1 w-fit">
                                      👤 {report.handler.username}
                                    </span>
                                    {handlerRoleBadge && (
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold w-fit ${handlerRoleBadge.color}`}>
                                        {handlerRoleBadge.text}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {new Date(report.created_at).toLocaleDateString('tr-TR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  {report.status === 'pending' && (
                                    <button
                                      onClick={() => handleMarkReportReviewed(report.id)}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-semibold"
                                      title="İncelendi Olarak İşaretle"
                                    >
                                      ✓ İncelendi
                                    </button>
                                  )}
                                  {report.listing && report.status !== 'resolved' && (
                                    <button
                                      onClick={() => handleDeleteListingFromReport(report.listing_id, report.id)}
                                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                      title="İlanı Sil"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'tickets' ? (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#1a1a1a]">Destek Talepleri Yönetimi</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">Talep ID / Konu</th>
                        <th className="text-left py-3 px-4">Kullanıcı</th>
                        <th className="text-left py-3 px-4">Kategori</th>
                        <th className="text-left py-3 px-4">Durum</th>
                        <th className="text-left py-3 px-4">Tarih</th>
                        <th className="text-left py-3 px-4">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">
                            Henüz destek talebi bulunmuyor
                          </td>
                        </tr>
                      ) : (
                        tickets.map((ticket) => {
                          const statusColors = {
                            open: 'bg-amber-100 text-amber-700',
                            answered: 'bg-blue-100 text-blue-700',
                            closed: 'bg-gray-100 text-gray-700'
                          };
                          const statusLabels = {
                            open: 'Açık',
                            answered: 'Yanıtlandı',
                            closed: 'Kapalı'
                          };
                          const categoryLabels = {
                            order: 'Sipariş',
                            listing: 'İlan',
                            complaint: 'Şikayet',
                            other: 'Diğer'
                          };
                          
                          return (
                            <tr 
                              key={ticket.id} 
                              className={`border-b border-gray-100 hover:bg-gray-50 ${
                                ticket.status === 'open' ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-500 font-mono">
                                    #{ticket.id.slice(0, 8)}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {ticket.subject}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {users.find(u => u.id === ticket.user_id)?.username || 'Bilinmeyen'}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                                  {categoryLabels[ticket.category]}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${statusColors[ticket.status]}`}>
                                  {ticket.status === 'open' && <Clock className="w-3 h-3" />}
                                  {ticket.status === 'answered' && <MessageCircle className="w-3 h-3" />}
                                  {ticket.status === 'closed' && <CheckCircle2 className="w-3 h-3" />}
                                  {statusLabels[ticket.status]}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {new Date(ticket.created_at).toLocaleDateString('tr-TR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <Link
                                  to={`/tickets/${ticket.id}`}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-semibold"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  İncele / Yanıtla
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'activity' ? (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#1a1a1a]">📜 Aktivite Logları</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Sistemdeki tüm kullanıcı aktivitelerini buradan takip edebilirsiniz.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">İşlem Tipi</th>
                        <th className="text-left py-3 px-4">Açıklama</th>
                        <th className="text-left py-3 px-4">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogs.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-500">
                            Henüz aktivite kaydı bulunmuyor
                          </td>
                        </tr>
                      ) : (
                        activityLogs.map((log) => {
                          const user = users.find(u => u.id === log.user_id);
                          const username = user?.username || 'Bilinmeyen Kullanıcı';
                          const icon = getActivityIcon(log.action);
                          const badgeColor = getActivityBadgeColor(log.action);
                          const message = formatLogMessage(log, username);
                          
                          return (
                            <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${badgeColor}`}>
                                  <span>{icon}</span>
                                  <span>{log.action}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">
                                {message}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
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
                <h2 className="text-xl font-bold mb-4 text-[#1a1a1a]">💰 Finansal Geçmiş</h2>
                
                {/* Filter Buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setFinancialFilter('all')}
                    className={`px-4 py-2 rounded-[1rem] font-semibold transition-colors ${
                      financialFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Tümü
                  </button>
                  <button
                    onClick={() => setFinancialFilter('expenses')}
                    className={`px-4 py-2 rounded-[1rem] font-semibold transition-colors ${
                      financialFilter === 'expenses'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Harcamalar
                  </button>
                  <button
                    onClick={() => setFinancialFilter('deposits')}
                    className={`px-4 py-2 rounded-[1rem] font-semibold transition-colors ${
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
            ) : activeTab === 'pricing' ? (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#1a1a1a]">💵 Fiyatlandırma & İndirim Yönetimi</h2>
                <p className="text-sm text-gray-600 mb-6">
                  İlan ücretlerini, boost fiyatlarını, bakiye yükleme bonuslarını ve genel indirimleri buradan yönetin. Değişiklikler anında tüm sitede geçerli olur.
                </p>

                <div className="max-w-4xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Listing Fee */}
                    <div className="bg-gradient-to-br from-blue-50/40 to-white rounded-[1.5rem] p-6 border border-blue-100">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        💼 İlan Ücreti ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricingSettings.listing_fee}
                        onChange={(e) => setPricingSettings({ ...pricingSettings, listing_fee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-[1rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="10.00"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Kullanıcıların yeni ilan oluştururken ödeyeceği standart ücret
                      </p>
                      {pricingSettings.global_discount_rate > 0 && (
                        <p className="text-xs text-emerald-600 mt-1 font-semibold">
                          İndirimli: ${(pricingSettings.listing_fee * (1 - pricingSettings.global_discount_rate / 100)).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Boost Fee 24h */}
                    <div className="bg-gradient-to-br from-amber-50/40 to-white rounded-[1.5rem] p-6 border border-amber-100">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        🚀 Boost Ücreti - 24 Saat ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricingSettings.boost_fee_24h}
                        onChange={(e) => setPricingSettings({ ...pricingSettings, boost_fee_24h: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-[1rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="15.00"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        24 saat boyunca öne çıkarma ücreti
                      </p>
                      {pricingSettings.global_discount_rate > 0 && (
                        <p className="text-xs text-emerald-600 mt-1 font-semibold">
                          İndirimli: ${(pricingSettings.boost_fee_24h * (1 - pricingSettings.global_discount_rate / 100)).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Boost Fee 7d */}
                    <div className="bg-gradient-to-br from-orange-50/40 to-white rounded-[1.5rem] p-6 border border-orange-100">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        🚀 Boost Ücreti - 1 Hafta ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricingSettings.boost_fee_7d}
                        onChange={(e) => setPricingSettings({ ...pricingSettings, boost_fee_7d: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-[1rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="50.00"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        1 hafta (7 gün) boyunca öne çıkarma ücreti
                      </p>
                      {pricingSettings.global_discount_rate > 0 && (
                        <p className="text-xs text-emerald-600 mt-1 font-semibold">
                          İndirimli: ${(pricingSettings.boost_fee_7d * (1 - pricingSettings.global_discount_rate / 100)).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Deposit Bonus Rate */}
                    <div className="bg-gradient-to-br from-emerald-50/40 to-white rounded-[1.5rem] p-6 border border-emerald-100">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        🎁 Bakiye Yükleme Bonusu (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={pricingSettings.deposit_bonus_rate}
                        onChange={(e) => setPricingSettings({ ...pricingSettings, deposit_bonus_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-[1rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Kullanıcılar bakiye yüklerken ekstra alacakları bonus yüzdesi
                      </p>
                      {pricingSettings.deposit_bonus_rate > 0 && (
                        <p className="text-xs text-emerald-600 mt-1 font-semibold">
                          Örnek: $100 yüklemede +${(100 * pricingSettings.deposit_bonus_rate / 100).toFixed(2)} bonus
                        </p>
                      )}
                    </div>

                    {/* Global Discount Rate */}
                    <div className="bg-gradient-to-br from-rose-50/40 to-white rounded-[1.5rem] p-6 border border-rose-100">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        🏷️ Genel İndirim Oranı (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={pricingSettings.global_discount_rate}
                        onChange={(e) => setPricingSettings({ ...pricingSettings, global_discount_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-[1rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Tüm ücretlere (ilan, boost) uygulanacak indirim yüzdesi
                      </p>
                      {pricingSettings.global_discount_rate > 0 && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold">
                          Kampanya aktif! Tüm ücretlerde %{pricingSettings.global_discount_rate} indirim
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSavePricingSettings}
                      disabled={pricingLoading}
                      className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-[1.5rem] hover:bg-emerald-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {pricingLoading ? 'Kaydediliyor...' : '💾 Fiyatlandırma Ayarlarını Kaydet'}
                    </button>
                    <button
                      onClick={loadData}
                      disabled={pricingLoading}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-[1.5rem] hover:bg-gray-200 font-semibold transition-colors disabled:opacity-50"
                    >
                      🔄 Sıfırla
                    </button>
                  </div>

                  {/* Preview Section */}
                  <div className="bg-gradient-to-br from-purple-50/40 to-white rounded-[1.5rem] p-6 border border-purple-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">👁️ Fiyat Önizlemesi</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-white rounded-[1rem] p-4 shadow-sm border border-blue-100 text-center">
                        <p className="text-xs text-gray-600 mb-1">İlan Ücreti</p>
                        {pricingSettings.global_discount_rate > 0 ? (
                          <>
                            <p className="text-lg font-bold text-gray-400 line-through">${pricingSettings.listing_fee.toFixed(2)}</p>
                            <p className="text-xl font-bold text-emerald-600">
                              ${(pricingSettings.listing_fee * (1 - pricingSettings.global_discount_rate / 100)).toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">${pricingSettings.listing_fee.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="bg-white rounded-[1rem] p-4 shadow-sm border border-amber-100 text-center">
                        <p className="text-xs text-gray-600 mb-1">Boost 24h</p>
                        {pricingSettings.global_discount_rate > 0 ? (
                          <>
                            <p className="text-lg font-bold text-gray-400 line-through">${pricingSettings.boost_fee_24h.toFixed(2)}</p>
                            <p className="text-xl font-bold text-emerald-600">
                              ${(pricingSettings.boost_fee_24h * (1 - pricingSettings.global_discount_rate / 100)).toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">${pricingSettings.boost_fee_24h.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="bg-white rounded-[1rem] p-4 shadow-sm border border-orange-100 text-center">
                        <p className="text-xs text-gray-600 mb-1">Boost 7d</p>
                        {pricingSettings.global_discount_rate > 0 ? (
                          <>
                            <p className="text-lg font-bold text-gray-400 line-through">${pricingSettings.boost_fee_7d.toFixed(2)}</p>
                            <p className="text-xl font-bold text-emerald-600">
                              ${(pricingSettings.boost_fee_7d * (1 - pricingSettings.global_discount_rate / 100)).toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">${pricingSettings.boost_fee_7d.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="bg-white rounded-[1rem] p-4 shadow-sm border border-emerald-100 text-center">
                        <p className="text-xs text-gray-600 mb-1">$100 Yüklemede</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          ${(100 + (100 * pricingSettings.deposit_bonus_rate / 100)).toFixed(2)}
                        </p>
                        {pricingSettings.deposit_bonus_rate > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">+${(100 * pricingSettings.deposit_bonus_rate / 100).toFixed(2)} bonus</p>
                        )}
                      </div>
                      <div className="bg-white rounded-[1rem] p-4 shadow-sm border border-rose-100 text-center">
                        <p className="text-xs text-gray-600 mb-1">İndirim Oranı</p>
                        <p className="text-2xl font-bold text-rose-600">%{pricingSettings.global_discount_rate.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'settings' ? (
              <div>
                <h2 className="text-xl font-bold mb-4 text-[#1a1a1a]">⚙️ Sistem Ayarları</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Ana sayfadaki istatistik kartlarının içeriğini buradan düzenleyebilirsiniz.
                </p>

                <div className="max-w-2xl space-y-6">
                  {/* Security Rate */}
                  <div className="bg-gradient-to-br from-blue-50/40 to-white rounded-[1.5rem] p-6 border border-blue-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🛡️ Güvenlik Oranı (Sadece Rakam)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={siteSettings.stats_security_rate}
                      onChange={(e) => setSiteSettings({ ...siteSettings, stats_security_rate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-[1rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="99"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Ana sayfada "%{siteSettings.stats_security_rate}" olarak görünecek
                    </p>
                  </div>

                  {/* Security Text */}
                  <div className="bg-gradient-to-br from-blue-50/40 to-white rounded-[1.5rem] p-6 border border-blue-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🛡️ Güvenlik Metni
                    </label>
                    <input
                      type="text"
                      value={siteSettings.stats_security_text}
                      onChange={(e) => setSiteSettings({ ...siteSettings, stats_security_text: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-[1rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Güvenli"
                    />
                  </div>

                  {/* Approval Title */}
                  <div className="bg-gradient-to-br from-amber-50/40 to-white rounded-[1.5rem] p-6 border border-amber-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ⚡ Onay Başlığı
                    </label>
                    <input
                      type="text"
                      value={siteSettings.stats_approval_title}
                      onChange={(e) => setSiteSettings({ ...siteSettings, stats_approval_title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-[1rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Hızlı Onay"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      İlk kelime büyük, ikinci kelime küçük gösterilir
                    </p>
                  </div>

                  {/* Support Title */}
                  <div className="bg-gradient-to-br from-rose-50/40 to-white rounded-[1.5rem] p-6 border border-rose-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ✨ Destek Başlığı
                    </label>
                    <input
                      type="text"
                      value={siteSettings.stats_support_title}
                      onChange={(e) => setSiteSettings({ ...siteSettings, stats_support_title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-[1rem] text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      placeholder="Kesintisiz İletişim"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      İlk kelime büyük, ikinci kelime küçük gösterilir
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveSettings}
                      disabled={settingsLoading}
                      className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-[1.5rem] hover:bg-emerald-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {settingsLoading ? 'Kaydediliyor...' : '💾 Ayarları Kaydet'}
                    </button>
                    <button
                      onClick={loadData}
                      disabled={settingsLoading}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-[1.5rem] hover:bg-gray-200 font-semibold transition-colors disabled:opacity-50"
                    >
                      🔄 Sıfırla
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="bg-gradient-to-br from-emerald-50/40 to-white rounded-[1.5rem] p-6 border border-emerald-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">👁️ Önizleme</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-blue-100 text-center">
                        <p className="text-2xl font-light text-[#1a1a1a]">%{siteSettings.stats_security_rate}</p>
                        <p className="text-xs text-gray-600 mt-1">{siteSettings.stats_security_text}</p>
                      </div>
                      <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-amber-100 text-center">
                        <p className="text-2xl font-light text-[#1a1a1a]">{siteSettings.stats_approval_title.split(' ')[0]}</p>
                        <p className="text-xs text-gray-600 mt-1">{siteSettings.stats_approval_title.split(' ').slice(1).join(' ')}</p>
                      </div>
                      <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-rose-100 text-center">
                        <p className="text-2xl font-light text-[#1a1a1a]">{siteSettings.stats_support_title.split(' ')[0]}</p>
                        <p className="text-xs text-gray-600 mt-1">{siteSettings.stats_support_title.split(' ').slice(1).join(' ')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
