import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Navbar } from '../components/layout/Navbar';
import { MarketCard } from '../components/listings/MarketCard';
import { fetchListings, deleteListing } from '../lib/listings';
import { Plus } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Listing = Database['public']['Tables']['listings']['Row'];

export function MyListingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotification();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadMyListings();
  }, [user, navigate]);

  const loadMyListings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await fetchListings({ userId: user.id });
      setListings(data);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#1a1a1a]">İlan Mağazam</h1>
          <button
            onClick={() => navigate('/listings/new')}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-[1.5rem] hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni İlan</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">İlanlarınız yükleniyor...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-gray-200 shadow-sm">
            <p className="text-xl text-gray-700 mb-4">Henüz ilan oluşturmadınız</p>
            <button
              onClick={() => navigate('/listings/new')}
              className="bg-emerald-600 text-white px-6 py-3 rounded-[1.5rem] hover:bg-emerald-700 transition-colors shadow-sm"
            >
              İlk İlanınızı Oluşturun
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <MarketCard
                key={listing.id}
                listing={listing}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
