import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { LogOut, User, Plus, DollarSign, Home, Package, Shield, Menu, X, Store, Coins } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const handleAddTestBalance = async () => {
    if (!user) return;

    setLoadingBalance(true);
    try {
      const { error } = await supabase.rpc('add_test_balance', { p_user_id: user.id });
      if (error) throw error;
      
      showToast('💰 Test bakiyesi eklendi! (+$50,000)', 'success');
      window.location.reload(); // Refresh to update balance
    } catch (err: any) {
      showToast(err.message || 'Bakiye eklenemedi', 'error');
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo - LISTER Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <span className="text-white font-black text-xl">L</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                LISTER
              </span>
              <p className="text-xs text-gray-500 -mt-1 font-medium">Premium Marketplace</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {user && (
              <>
                <Link
                  to="/"
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span className="font-medium">Ana Sayfa</span>
                </Link>
                <Link
                  to="/my-listings"
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Package className="w-5 h-5" />
                  <span className="font-medium">İlanlarım</span>
                </Link>
                <Link
                  to="/shop/manage"
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Store className="w-5 h-5" />
                  <span className="font-medium">Mağazalarım</span>
                </Link>
                {(profile?.is_admin || profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'moderator') && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Yönetim Paneli</span>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {user && profile ? (
              <>
                {/* Test Balance Button */}
                <button
                  onClick={handleAddTestBalance}
                  disabled={loadingBalance}
                  className="hidden md:flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 px-4 py-2 rounded-xl hover:shadow-md transition-all disabled:opacity-50"
                  title="Test bakiyesi ekle"
                >
                  <Coins className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-semibold text-yellow-700">
                    {loadingBalance ? 'Yükleniyor...' : '💰 Test Bakiyesi (+$50K)'}
                  </span>
                </button>

                {/* Balance with glassmorphism */}
                <Link
                  to="/wallet"
                  className="hidden md:flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-4 py-2 rounded-xl hover:shadow-md transition-all backdrop-blur-sm"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-600 font-medium">Bakiye</span>
                    <span className="text-green-700 font-bold">
                      ${profile.balance?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </Link>

                {/* Create Listing Button */}
                <button
                  onClick={() => navigate('/listings/new')}
                  className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span>İlan Oluştur</span>
                </button>

                {/* User Menu */}
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    to="/profile/edit"
                    className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <span className="text-gray-700 font-semibold">{profile.username}</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-gray-600 hover:text-blue-600"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Giriş Yap / Kayıt Ol
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-3">
              <Link
                to="/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-3 rounded-lg"
              >
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-700">${profile?.balance?.toFixed(2) || '0.00'}</span>
              </Link>
              
              <button
                onClick={() => {
                  navigate('/listings/new');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>İlan Oluştur</span>
              </button>

              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 px-4 py-2"
              >
                <Home className="w-5 h-5" />
                <span>Ana Sayfa</span>
              </Link>

              <Link
                to="/my-listings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 px-4 py-2"
              >
                <Package className="w-5 h-5" />
                <span>İlanlarım</span>
              </Link>

              <Link
                to="/shop/manage"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 px-4 py-2"
              >
                <Store className="w-5 h-5" />
                <span>Mağazalarım</span>
              </Link>

              {(profile?.is_admin || profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'moderator') && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 px-4 py-2"
                >
                  <Shield className="w-5 h-5" />
                  <span>Yönetim Paneli</span>
                </Link>
              )}

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 px-4 py-2 mt-2 border-t border-gray-200"
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
