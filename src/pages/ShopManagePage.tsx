import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/layout/Navbar';
import { getUserShops, type Shop } from '../lib/shops';
import { Store, Plus, Settings, Users, Package } from 'lucide-react';
import { VerificationBadge } from '../components/common/VerificationBadge';

export function ShopManagePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadShops();
  }, [user, navigate]);

  const loadShops = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userShops = await getUserShops(user.id);
      setShops(userShops);
    } catch (err) {
      console.error('Failed to load shops:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">
              Mağaza Yönetimi
            </h1>
            <p className="text-lg text-gray-600">
              Mağazalarınızı yönetin ve yeni mağaza oluşturun
            </p>
          </div>
          <Link
            to="/shop/create"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Mağaza</span>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Mağazalar yükleniyor...</p>
            </div>
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Henüz mağazanız yok
            </h3>
            <p className="text-gray-600 mb-6">
              İlk mağazanızı oluşturun ve ürünlerinizi satmaya başlayın
            </p>
            <Link
              to="/shop/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Mağaza Oluştur</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <div
                key={shop.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Shop Logo/Header */}
                <div className={`h-40 relative ${
                  shop.logo_url 
                    ? 'bg-gray-50' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                }`}>
                  {shop.logo_url ? (
                    <img
                      src={shop.logo_url}
                      alt={shop.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-12 h-12 text-white opacity-50" />
                    </div>
                  )}
                </div>

                {/* Shop Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    {shop.name}
                    <VerificationBadge isVerified={shop.is_verified || false} type="shop" />
                  </h3>
                  {shop.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {shop.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span>0 İlan</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>1 Üye</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate(`/shop/${shop.id}/edit`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Yönet</span>
                    </button>
                    <button 
                      onClick={() => navigate(`/shop/${shop.id}/listings`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    >
                      <Package className="w-4 h-4" />
                      <span>İlanlar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
