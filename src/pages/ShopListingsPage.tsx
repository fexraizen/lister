import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Navbar } from '../components/layout/Navbar';
import { supabase } from '../lib/supabase';
import { getShopById, getUserRoleInShop, type Shop } from '../lib/shops';
import { MarketCard } from '../components/listings/MarketCard';
import { ArrowLeft, Store, Package } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Listing = Database['public']['Tables']['listings']['Row'];

export function ShopListingsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotification();
  const [shop, setShop] = useState<Shop | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) {
      navigate('/auth');
      return;
    }

    loadShopAndListings();
  }, [user, id, navigate]);

  const loadShopAndListings = async () => {
    if (!user || !id) return;

    try {
      setLoading(true);
      
      // Check if user has permission
      const role = await getUserRoleInShop(user.id, id);
      if (!role) {
        showToast('Bu mağazanın ilanlarını görüntüleme yetkiniz yok', 'error');
        navigate('/shop/manage');
        return;
      }

      // Load shop
      const shopData = await getShopById(id);
      if (!shopData) {
        showToast('Mağaza bulunamadı', 'error');
        navigate('/shop/manage');
        return;
      }
      setShop(shopData);

      // Load listings for this shop
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('shop_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Failed to load shop listings:', err);
      showToast('İlanlar yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    showConfirm({
      title: 'İlan Silme',
      message: 'Bu ilanı silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('listings')
            .delete()
            .eq('id', listingId);

          if (error) throw error;

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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">İlanlar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/shop/manage')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Mağazalarıma Dön</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center overflow-hidden">
              {shop?.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt={shop.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                {shop?.name}
              </h1>
              <p className="text-lg text-gray-600">
                Mağaza İlanları
              </p>
            </div>
          </div>
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Henüz ilan yok
            </h3>
            <p className="text-gray-600 mb-6">
              Bu mağaza için henüz ilan oluşturulmamış
            </p>
            <button
              onClick={() => navigate('/listings/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
            >
              <Package className="w-5 h-5" />
              <span>İlan Oluştur</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <MarketCard
                key={listing.id}
                listing={listing}
                onDelete={handleDeleteListing}
                onPurchaseSuccess={loadShopAndListings}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
