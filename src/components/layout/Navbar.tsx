import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Plus, DollarSign, Home, Package, Shield, Menu, X, Store } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo - LISTER Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[1rem] flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                <span className="text-white font-bold text-xl">L</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="text-2xl font-light text-[#1a1a1a]">
                LISTER
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {user && (
              <>
                <Link
                  to="/"
                  className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-all duration-300 font-normal"
                >
                  <Home className="w-4 h-4" />
                  <span>Ana Sayfa</span>
                </Link>
                <Link
                  to="/my-listings"
                  className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-all duration-300 font-normal"
                >
                  <Package className="w-4 h-4" />
                  <span>İlan Mağazam</span>
                </Link>
                <Link
                  to="/shop/manage"
                  className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-all duration-300 font-normal"
                >
                  <Store className="w-4 h-4" />
                  <span>Mağazalarım</span>
                </Link>
                {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'moderator') && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-all duration-300 font-normal"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Kontrol Merkezi</span>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {user && profile ? (
              <>
                {/* Balance - Natural Badge */}
                <Link
                  to="/wallet"
                  className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-[1.5rem] hover:bg-emerald-100 transition-all duration-300"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-[#1a1a1a] font-medium text-sm">
                    ${profile.balance?.toFixed(2) || '0.00'}
                  </span>
                </Link>

                {/* Create Listing Button - Natural */}
                <button
                  onClick={() => navigate('/listings/new')}
                  className="hidden md:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-[1.5rem] font-medium text-sm shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                  <span>İlan Oluştur</span>
                </button>

                {/* User Menu - Natural */}
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    to="/profile/edit"
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-[1.5rem] border border-gray-200 transition-all duration-300"
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
                    <span className="text-[#1a1a1a] font-medium text-sm">{profile.username}</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-300"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-gray-600 hover:text-emerald-600"
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
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-3">
              <Link
                to="/wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-[1.5rem]"
              >
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-[#1a1a1a]">${profile?.balance?.toFixed(2) || '0.00'}</span>
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
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 px-4 py-2"
              >
                <Home className="w-5 h-5" />
                <span>Ana Sayfa</span>
              </Link>

              <Link
                to="/my-listings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 px-4 py-2"
              >
                <Package className="w-5 h-5" />
                <span>İlan Mağazam</span>
              </Link>

              <Link
                to="/shop/manage"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 px-4 py-2"
              >
                <Store className="w-5 h-5" />
                <span>Mağazalarım</span>
              </Link>

              {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'moderator') && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 px-4 py-2"
                >
                  <Shield className="w-5 h-5" />
                  <span>Kontrol Merkezi</span>
                </Link>
              )}

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 px-4 py-2 mt-2 border-t border-gray-200"
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
