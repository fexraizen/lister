import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { MarketplaceFeed } from '../components/marketplace/MarketplaceFeed';
import { Plus, Car, Building2, Package, Briefcase, TrendingUp, Shield, Zap } from 'lucide-react';

export function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleCategoryClick = (category: string) => {
    const slugMap: Record<string, string> = {
      'vehicle': 'vehicles',
      'real_estate': 'real-estate',
      'item': 'items',
      'service': 'services',
    };
    navigate(`/category/${slugMap[category]}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
              LISTER
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-2">
              Premium Marketplace Platform
            </p>
            <p className="text-blue-200 mb-8">
              Araç, emlak, ürün ve hizmet - Güvenli alışverişin tek adresi
            </p>

            {user && (
              <button
                onClick={() => navigate('/listings/new')}
                className="inline-flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-all shadow-lg"
              >
                <Plus className="w-6 h-6" />
                <span>İlan Oluştur</span>
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 text-center">
              <TrendingUp className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">1000+</p>
              <p className="text-sm text-blue-100">Aktif İlan</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 text-center">
              <Shield className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">%100</p>
              <p className="text-sm text-blue-100">Güvenli</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 text-center">
              <Zap className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">Anında</p>
              <p className="text-sm text-blue-100">İşlem</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 text-center">
              <Package className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">7/24</p>
              <p className="text-sm text-blue-100">Destek</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Kategoriler
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Vehicles */}
          <button
            onClick={() => handleCategoryClick('vehicle')}
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer text-left"
          >
            <div className="bg-blue-50 w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <Car className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Araçlar</h3>
            <p className="text-gray-600 text-sm">
              Otomobil, motosiklet ve ticari araçlar
            </p>
            <div className="mt-4 text-blue-600 text-sm font-medium">
              Keşfet →
            </div>
          </button>

          {/* Real Estate */}
          <button
            onClick={() => handleCategoryClick('real_estate')}
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer text-left"
          >
            <div className="bg-green-50 w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
              <Building2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Emlak</h3>
            <p className="text-gray-600 text-sm">
              Konut, işyeri ve arsa ilanları
            </p>
            <div className="mt-4 text-blue-600 text-sm font-medium">
              Keşfet →
            </div>
          </button>

          {/* Items */}
          <button
            onClick={() => handleCategoryClick('item')}
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer text-left"
          >
            <div className="bg-purple-50 w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
              <Package className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ürünler</h3>
            <p className="text-gray-600 text-sm">
              Elektronik, mobilya ve diğer ürünler
            </p>
            <div className="mt-4 text-blue-600 text-sm font-medium">
              Keşfet →
            </div>
          </button>

          {/* Services */}
          <button
            onClick={() => handleCategoryClick('service')}
            className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer text-left"
          >
            <div className="bg-orange-50 w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
              <Briefcase className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hizmetler</h3>
            <p className="text-gray-600 text-sm">
              Profesyonel hizmet ve danışmanlık
            </p>
            <div className="mt-4 text-blue-600 text-sm font-medium">
              Keşfet →
            </div>
          </button>
        </div>

        {/* Marketplace Feed */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Popüler İlanlar
          </h2>
          <MarketplaceFeed />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 font-semibold mb-1">
            © 2024 LISTER. Tüm hakları saklıdır.
          </p>
          <p className="text-gray-500 text-sm">
            Premium Marketplace Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
