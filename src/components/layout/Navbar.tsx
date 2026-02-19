import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Plus, DollarSign, Menu, X, Search, Home, LayoutList, Store, Shield, LifeBuoy, Heart, Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Subscribe to new notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      loadNotifications();
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      loadNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    setMobileMenuOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between w-full gap-4 h-16">
          {/* LEFT - Logo Only (No Shrink) */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center group">
              <img 
                src="https://i.imgur.com/8VuKSmM.png" 
                alt="LISTER" 
                className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>

          {/* CENTER - Links + Search + Links (Golden Symmetry) */}
          {user && (
            <div className="hidden lg:flex items-center justify-center gap-6 flex-grow">
              {/* Left Links */}
              <Link
                to="/"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors duration-300 whitespace-nowrap"
              >
                <Home className="w-4 h-4" />
                <span>Ana Sayfa</span>
              </Link>
              <Link
                to="/my-listings"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors duration-300 whitespace-nowrap"
              >
                <LayoutList className="w-4 h-4" />
                <span>İlanlarım</span>
              </Link>
              <Link
                to="/favorites"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors duration-300 whitespace-nowrap"
              >
                <Heart className="w-4 h-4" />
                <span>Favorilerim</span>
              </Link>

              {/* Search Bar - Compact */}
              <form onSubmit={handleSearch} className="w-72">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ara..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-full text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all duration-300"
                  />
                </div>
              </form>

              {/* Right Links */}
              <Link
                to="/shop/manage"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors duration-300 whitespace-nowrap"
              >
                <Store className="w-4 h-4" />
                <span>Mağazalarım</span>
              </Link>
              <Link
                to="/tickets"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors duration-300 whitespace-nowrap"
              >
                <LifeBuoy className="w-4 h-4" />
                <span>Destek</span>
              </Link>
              {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'moderator') && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors duration-300 whitespace-nowrap"
                >
                  <Shield className="w-4 h-4" />
                  <span>Kontrol Merkezi</span>
                </Link>
              )}
            </div>
          )}

          {/* RIGHT - User Actions (No Shrink) */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user && profile ? (
              <>
                {/* Balance */}
                <Link
                  to="/wallet"
                  className="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-[1.5rem] hover:bg-emerald-100 transition-all duration-300"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-900 font-medium text-sm">
                    ${profile.balance?.toFixed(2) || '0.00'}
                  </span>
                </Link>

                {/* Create Listing Button */}
                <button
                  onClick={() => navigate('/listings/new')}
                  className="hidden lg:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-[1.5rem] font-medium text-sm shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                  <span>İlan Oluştur</span>
                </button>

                {/* Notification Bell */}
                <div className="hidden lg:block relative" ref={notificationRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-slate-700 hover:text-emerald-600 hover:bg-slate-100 rounded-full transition-all duration-300"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Bildirimler</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            Tümünü Okundu İşaretle
                          </button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-500">
                            <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            <p>Henüz bildiriminiz yok</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => !notification.is_read && markAsRead(notification.id)}
                              className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                                !notification.is_read ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-slate-900 text-sm mb-1">
                                    {notification.title}
                                  </h4>
                                  <p className="text-slate-600 text-xs mb-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-slate-400 text-xs">
                                    {formatNotificationTime(notification.created_at)}
                                  </p>
                                </div>
                                {!notification.is_read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile */}
                <Link
                  to="/profile/edit"
                  className="hidden lg:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-[1.5rem] border border-slate-200 transition-all duration-300"
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-slate-900 font-medium text-sm">{profile.username}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleSignOut}
                  className="hidden lg:flex p-2 text-slate-700 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-300"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-slate-700 hover:text-emerald-600"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-[1.5rem] font-medium text-sm shadow-sm hover:shadow-md transition-all duration-300"
              >
                Giriş Yap
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && user && (
          <div className="lg:hidden py-4 border-t border-slate-200">
            <div className="flex flex-col gap-3">
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="İlan, ürün veya kategori ara..."
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-full text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </form>

              <Link
                to="/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-[1.5rem]"
              >
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-slate-900">${profile?.balance?.toFixed(2) || '0.00'}</span>
              </Link>
              
              <button
                onClick={() => {
                  navigate('/listings/new');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-[1.5rem] font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>İlan Oluştur</span>
              </button>

              <Link
                to="/favorites"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 px-4 py-2"
              >
                <Heart className="w-5 h-5" />
                <span>Favorilerim</span>
              </Link>

              <Link
                to="/profile/edit"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 px-4 py-2"
              >
                <User className="w-5 h-5" />
                <span>Profil</span>
              </Link>

              <Link
                to="/tickets"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 px-4 py-2"
              >
                <LifeBuoy className="w-5 h-5" />
                <span>Destek</span>
              </Link>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 px-4 py-2 mt-2 border-t border-slate-200"
              >
                <LogOut className="w-5 h-5" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
