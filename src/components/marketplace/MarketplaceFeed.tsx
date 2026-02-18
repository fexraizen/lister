import { useState, useEffect } from 'react';
import { MarketCard } from '../listings/MarketCard';
import { fetchListings, deleteListing, sortListings } from '../../lib/listings';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { Filter } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Listing = Database['public']['Tables']['listings']['Row'] & {
  profiles?: {
    username: string;
    store_name?: string | null;
  };
};

interface MarketplaceFeedProps {
  category?: string;
}

export function MarketplaceFeed({ category }: MarketplaceFeedProps) {
  const { showToast, showConfirm } = useNotification();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all');

  useEffect(() => {
    loadListings();

    // Set up real-time subscription
    const channel = supabase
      .channel('listings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listings',
        },
        (payload) => {
          if (payload.new.status === 'active' || payload.new.status === 'out_of_stock') {
            loadListings();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'listings',
        },
        (payload) => {
          setListings((current) =>
            current.map((listing) =>
              listing.id === payload.new.id
                ? { ...listing, ...payload.new }
                : listing
            ).filter(l => l.status === 'active' || l.status === 'out_of_stock')
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'listings',
        },
        (payload) => {
          setListings((current) =>
            current.filter((listing) => listing.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory]);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError('');
      const filters: any = {};
      
      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }

      const data = await fetchListings(filters);
      // Filter to only show active and out_of_stock listings
      const visibleListings = (data as Listing[]).filter(
        l => l.status === 'active' || l.status === 'out_of_stock'
      );
      
      // Separate boosted and non-boosted listings
      const boostedListings = visibleListings.filter(l => l.is_boosted);
      const regularListings = visibleListings.filter(l => !l.is_boosted);
      
      // Shuffle boosted listings for randomness
      const shuffledBoosted = boostedListings.sort(() => Math.random() - 0.5);
      
      // Take first 6 boosted listings, or fill with regular listings if less than 6
      let finalListings = shuffledBoosted.slice(0, 6);
      
      if (finalListings.length < 6) {
        const remainingSlots = 6 - finalListings.length;
        const sortedRegular = sortListings(regularListings);
        finalListings = [...finalListings, ...sortedRegular.slice(0, remainingSlots)];
      }
      
      setListings(finalListings);
    } catch (err: any) {
      setError(err.message || 'İlanlar yüklenemedi');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">İlanlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-[1.5rem]">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Category Filter */}
      <div className="mb-6 flex items-center gap-4 bg-white rounded-[2rem] p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter className="w-5 h-5 text-emerald-600" />
          <span className="font-medium">Filtrele:</span>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
        >
          <option value="all">Tüm Kategoriler</option>
          <option value="vehicle">🚗 Araçlar</option>
          <option value="real_estate">🏢 Emlak</option>
          <option value="item">📦 Ürünler</option>
          <option value="service">💼 Hizmetler</option>
        </select>
      </div>

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[2rem] border border-gray-200 shadow-sm">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-xl text-[#1a1a1a] mb-2">Henüz ilan bulunamadı</p>
          <p className="text-gray-600">İlk ilanı siz oluşturun!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
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
  );
}
