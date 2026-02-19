import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { supabase } from '../lib/supabase';
import { Search, Package } from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  status: string;
  is_boosted: boolean;
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) {
        setListings([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'active')
          .ilike('title', `%${query}%`)
          .order('is_boosted', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setListings(data || []);
      } catch (error) {
        console.error('Search error:', error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Search className="w-6 h-6 text-slate-600" />
            <h1 className="text-3xl font-light text-slate-900">
              Arama Sonuçları
            </h1>
          </div>
          {query && (
            <p className="text-slate-600 text-lg">
              "<span className="font-medium text-slate-900">{query}</span>" için sonuçlar
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto"></div>
              <p className="mt-4 text-slate-600">Aranıyor...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && listings.length > 0 && (
          <div>
            <p className="text-slate-600 mb-6">
              {listings.length} ilan bulundu
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && listings.length === 0 && query && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-white rounded-[2rem] p-12 shadow-sm border border-slate-100 text-center max-w-md">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-light text-slate-900 mb-3">
                Sonuç Bulunamadı
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Üzgünüz, "<span className="font-medium text-slate-900">{query}</span>" için aradığınız kriterlere uygun ilan bulunamadı.
              </p>
              <p className="text-slate-500 text-sm mt-4">
                Farklı anahtar kelimeler deneyebilir veya kategorilere göz atabilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* No Query State */}
        {!loading && !query && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-white rounded-[2rem] p-12 shadow-sm border border-slate-100 text-center max-w-md">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-light text-slate-900 mb-3">
                Arama Yapın
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Yukarıdaki arama çubuğunu kullanarak ilan, ürün veya kategori arayabilirsiniz.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Listing Card Component
function ListingCard({ listing }: { listing: Listing }) {
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      vehicle: 'Araç',
      real_estate: 'Emlak',
      item: 'Ürün',
      service: 'Hizmet',
    };
    return labels[category] || category;
  };

  return (
    <a
      href={`/listing/${listing.id}`}
      className="group bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-slate-300" />
          </div>
        )}
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-slate-700">
            {getCategoryLabel(listing.category)}
          </span>
        </div>
        {/* Boosted Badge */}
        {listing.is_boosted && (
          <div className="absolute top-3 right-3">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Öne Çıkan
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-medium text-slate-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {listing.title}
        </h3>
        <p className="text-slate-600 text-sm line-clamp-2 mb-3">
          {listing.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-light text-emerald-600">
            ${listing.price.toLocaleString()}
          </span>
        </div>
      </div>
    </a>
  );
}
