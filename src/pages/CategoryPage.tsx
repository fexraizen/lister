import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { MarketCard } from '../components/listings/MarketCard';
import { fetchListings, deleteListing } from '../lib/listings';
import { useNotification } from '../contexts/NotificationContext';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Listing = Database['public']['Tables']['listings']['Row'] & {
  profiles?: {
    username: string;
    store_name?: string | null;
  };
};

type CategorySlug = 'vehicles' | 'real-estate' | 'items' | 'services';

const categoryConfig = {
  vehicles: {
    title: 'Premium Araç Koleksiyonu',
    description: 'En kaliteli araçları keşfedin',
    dbValue: 'vehicle' as const,
  },
  'real-estate': {
    title: 'Emlak Portföyü',
    description: 'Hayalinizdeki mülkü bulun',
    dbValue: 'real_estate' as const,
  },
  items: {
    title: 'Ürün Kataloğu',
    description: 'Kaliteli ürünler, güvenli alışveriş',
    dbValue: 'item' as const,
  },
  services: {
    title: 'Profesyonel Hizmetler',
    description: 'Uzman hizmet sağlayıcıları',
    dbValue: 'service' as const,
  },
};

export function CategoryPage() {
  const { slug } = useParams<{ slug: CategorySlug }>();
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotification();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filters
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  useEffect(() => {
    if (!slug || !categoryConfig[slug]) {
      navigate('/');
      return;
    }
    loadListings();
  }, [slug, navigate]);

  const loadListings = async () => {
    if (!slug || !categoryConfig[slug]) return;

    try {
      setLoading(true);
      const data = await fetchListings({
        category: categoryConfig[slug].dbValue,
      });
      // Filter to only show active and out_of_stock listings
      const visibleListings = (data as Listing[]).filter(
        l => l.status === 'active' || l.status === 'out_of_stock'
      );
      setListings(visibleListings);
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    showConfirm({
      title: 'İlan Silme',
      message: 'Bu ilanı silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      onConfirm: async () => {
        try {
          await deleteListing(listingId);
          setListings(listings.filter(l => l.id !== listingId));
          showToast('İlan başarıyla silindi', 'success');
        } catch (err: any) {
          showToast(err.message || 'İlan silinemedi', 'error');
        }
      }
    });
  };

  const getFilteredAndSortedListings = () => {
    let filtered = [...listings];

    // Price filter
    if (minPrice) {
      filtered = filtered.filter(l => l.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter(l => l.price <= parseFloat(maxPrice));
    }

    // Sort
    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
  };

  if (!slug || !categoryConfig[slug]) {
    return null;
  }

  const config = categoryConfig[slug];
  const filteredListings = getFilteredAndSortedListings();

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-bold text-gray-900">Filtreler</h3>
        </div>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Temizle
        </button>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Sıralama
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
          <option value="newest">En Yeni</option>
          <option value="price-asc">Fiyat: Düşükten Yükseğe</option>
          <option value="price-desc">Fiyat: Yüksekten Düşüğe</option>
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Fiyat Aralığı
        </label>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="Min. Fiyat"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <input
            type="number"
            placeholder="Max. Fiyat"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{filteredListings.length}</span> ilan bulundu
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-[#1a1a1a] mb-2 tracking-tight">
            {config.title}
          </h1>
          <p className="text-lg text-gray-600">{config.description}</p>
        </div>

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-[1.5rem] text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Filter className="w-5 h-5" />
            <span>Filtreler</span>
          </button>
        </div>

        {/* Mobile Filters Modal */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Filtreler</h2>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <FilterSidebar />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-white rounded-[2rem] p-6 shadow-sm border border-gray-200">
              <FilterSidebar />
            </div>
          </div>

          {/* Listings Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">İlanlar yükleniyor...</p>
                </div>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2rem] border border-gray-200 shadow-sm">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-xl text-[#1a1a1a] mb-2">İlan bulunamadı</p>
                <p className="text-gray-600">Filtrelerinizi değiştirmeyi deneyin</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <MarketCard
                    key={listing.id}
                    listing={listing}
                    onDelete={handleDelete}
                    onPurchaseSuccess={loadListings}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
