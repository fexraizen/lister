import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Navbar } from '../components/layout/Navbar';
import { supabase } from '../lib/supabase';
import { getShopById, type Shop } from '../lib/shops';
import { ArrowLeft, MapPin, Gauge, MessageCircle, Calendar, Store, Phone, User as UserIcon, Rocket, Zap, Clock } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { BoostModal } from '../components/listings/BoostModal';
import { ContactModal } from '../components/listings/ContactModal';

type Listing = Database['public']['Tables']['listings']['Row'] & {
  profiles?: {
    username: string;
    store_name?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
  };
};

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [listing, setListing] = useState<Listing | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadListing();
      incrementViewCount();
    } else {
      navigate('/');
    }
  }, [id, navigate]);

  const incrementViewCount = async () => {
    if (!id) return;
    
    try {
      await supabase.rpc('increment_view_count', { p_listing_id: id });
    } catch (err) {
      console.error('Failed to increment view count:', err);
    }
  };

  const loadListing = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:user_id (
            username,
            store_name,
            avatar_url,
            phone
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setListing(data as Listing);

      // Load shop if shop_id exists, otherwise load seller profile
      if (data.shop_id) {
        const shopData = await getShopById(data.shop_id);
        setShop(shopData);
      } else {
        // Load individual seller profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, avatar_url, phone, is_verified')
          .eq('id', data.user_id)
          .single();
        
        if (!profileError && profileData) {
          setSellerProfile(profileData);
        }
      }
    } catch (err) {
      console.error('Failed to load listing:', err);
      showToast('İlan yüklenemedi', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };



  const getCategoryLabel = () => {
    if (!listing) return '';
    switch (listing.category) {
      case 'vehicle':
        return 'Araç';
      case 'real_estate':
        return 'Emlak';
      case 'service':
        return 'Hizmet';
      default:
        return 'Ürün';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">İlan yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  const isOwner = user?.id === listing.user_id;
  const isActive = listing.status === 'active';
  const isOutOfStock = listing.status === 'out_of_stock';
  const isBoosted = listing.boosted_until && new Date(listing.boosted_until) > new Date();
  const boostEndDate = listing.boosted_until ? new Date(listing.boosted_until) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Geri Dön</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
              <div className="relative h-96 bg-gray-100">
                {listing.image_url ? (
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                    <div className="text-9xl opacity-20">
                      {listing.category === 'vehicle' && '🚗'}
                      {listing.category === 'real_estate' && '🏢'}
                      {listing.category === 'service' && '💼'}
                      {listing.category === 'item' && '📦'}
                    </div>
                  </div>
                )}
                {!isActive && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white text-4xl font-bold">
                      {isOutOfStock ? 'TÜKENDİ' : 'PASİF'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  {getCategoryLabel()}
                </span>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(listing.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>

              {/* Boost Badge */}
              {isBoosted && (
                <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg">
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold">⚡ Öne Çıkan İlan</span>
                </div>
              )}

              <h1 className="text-4xl font-bold text-gray-900 mb-4">{listing.title}</h1>

              {/* Boost Timer for Owner */}
              {isOwner && isBoosted && boostEndDate && (
                <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-900">Boost Aktif</p>
                      <p className="text-sm text-purple-700">
                        Bitiş: {boostEndDate.toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="prose max-w-none">
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>

              {/* Technical Specifications */}
              {listing.category === 'vehicle' && (listing.mileage !== null || listing.speed !== null) && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Teknik Özellikler</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {listing.mileage !== null && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <MapPin className="w-5 h-5" />
                          <span className="text-sm font-medium">Kilometre</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                          {listing.mileage.toLocaleString()} km
                        </p>
                      </div>
                    )}
                    {listing.speed !== null && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Gauge className="w-5 h-5" />
                          <span className="text-sm font-medium">Maksimum Hız</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                          {listing.speed} km/s
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Price Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Fiyat</p>
                  <p className="text-4xl font-bold text-gray-900">
                    ${listing.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {isOwner && isActive && (
                  <button
                    onClick={() => setShowBoostModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-lg mb-4"
                  >
                    <Rocket className="w-5 h-5" />
                    <span>🚀 İlanı Öne Çıkar</span>
                  </button>
                )}

                {!isOwner && (isActive || isOutOfStock) && (
                  <button
                    onClick={() => setShowContactModal(true)}
                    disabled={isOutOfStock}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all font-semibold text-lg ${
                      isOutOfStock
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{isOutOfStock ? 'Stokta Yok' : 'İletişime Geç'}</span>
                  </button>
                )}

                {!isOwner && !isActive && !isOutOfStock && (
                  <div className="w-full px-6 py-4 bg-gray-100 text-gray-500 rounded-xl text-center font-semibold text-lg">
                    Bu İlan Pasif
                  </div>
                )}
              </div>

              {/* Seller Card - Show shop if available, otherwise show individual seller */}
              {shop ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Mağaza Bilgileri</h3>
                  
                  <div className="space-y-4">
                    {/* Shop Logo & Name */}
                    <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                      <div className={`w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 ${
                        shop.logo_url 
                          ? 'bg-white border-2 border-gray-100' 
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      }`}>
                        {shop.logo_url ? (
                          <img
                            src={shop.logo_url}
                            alt={shop.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Store className="w-9 h-9 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-lg">
                            {shop.name}
                          </p>
                          <VerificationBadge isVerified={shop.is_verified || false} type="shop" />
                        </div>
                        {shop.description && (
                          <p className="text-sm text-gray-600 line-clamp-1">{shop.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Shop Details */}
                    <div className="space-y-3">
                      {shop.description && (
                        <div className="text-sm">
                          <p className="text-gray-600 text-xs mb-1">Açıklama</p>
                          <p className="text-gray-900">{shop.description}</p>
                        </div>
                      )}

                      {shop.phone && (
                        <div className="flex items-start gap-3 text-sm">
                          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Phone className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs mb-0.5">Telefon</p>
                            <p className="font-medium text-gray-900">{shop.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contact Button */}
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium mt-4">
                      <MessageCircle className="w-5 h-5" />
                      <span>Mağaza ile İletişime Geç</span>
                    </button>
                  </div>
                </div>
              ) : sellerProfile && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Satıcı Bilgileri</h3>
                  
                  <div className="space-y-4">
                    {/* Seller Avatar & Name */}
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center overflow-hidden">
                        {sellerProfile.avatar_url ? (
                          <img
                            src={sellerProfile.avatar_url}
                            alt={sellerProfile.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-7 h-7 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-lg">
                            {sellerProfile.username}
                          </p>
                          <VerificationBadge isVerified={sellerProfile.is_verified || false} type="user" />
                        </div>
                        <p className="text-sm text-gray-600">Bireysel Satıcı</p>
                      </div>
                    </div>

                    {/* Seller Details */}
                    {sellerProfile.phone && (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 text-sm">
                          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Phone className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs mb-0.5">Telefon</p>
                            <p className="font-medium text-gray-900">{sellerProfile.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Contact Button */}
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium mt-4">
                      <MessageCircle className="w-5 h-5" />
                      <span>Satıcıyla İletişime Geç</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <BoostModal
        listingId={listing.id}
        isOpen={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        onSuccess={() => loadListing()}
      />

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        sellerName={sellerProfile?.username || 'Satıcı'}
        sellerPhone={shop?.phone || sellerProfile?.phone}
        shopName={shop?.name}
        isShop={!!shop}
      />
    </div>
  );
}
