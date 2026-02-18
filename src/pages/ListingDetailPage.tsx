// Force update for Vercel build
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Navbar } from '../components/layout/Navbar';
import { supabase } from '../lib/supabase';
import { getShopById, type Shop } from '../lib/shops';
import { ArrowLeft, MapPin, Gauge, MessageCircle, Calendar, Store, Phone, User as UserIcon, Rocket, Zap, Clock, Edit, Trash2, AlertTriangle, X } from 'lucide-react';
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
  const { user, profile } = useAuth();
  const { showToast } = useNotification();
  const [listing, setListing] = useState<Listing | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

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

  const handleDeleteListing = async () => {
    if (!id || !listing) return;
    
    if (!window.confirm('Bu ilanı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('İlan başarıyla silindi', 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'İlan silinemedi', 'error');
    }
  };

  const handleSubmitReport = async () => {
    if (!user || !id) {
      showToast('Şikayet göndermek için giriş yapmalısınız', 'error');
      return;
    }

    if (!reportReason.trim()) {
      showToast('Lütfen bir şikayet nedeni girin', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('reports')
        .insert([{
          listing_id: id,
          reporter_id: user.id,
          reason: reportReason,
          status: 'pending'
        }]);

      if (error) throw error;
      showToast('Şikayetiniz başarıyla gönderildi', 'success');
      setShowReportModal(false);
      setReportReason('');
    } catch (err: any) {
      showToast(err.message || 'Şikayet gönderilemedi', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500 mx-auto"></div>
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
  
  // Check if user is admin/moderator
  const isAdminOrModerator = profile?.role === 'admin' || 
                             profile?.role === 'super_admin' || 
                             profile?.role === 'moderator';
  
  // Can edit/delete if owner OR admin/moderator
  const canManage = isOwner || isAdminOrModerator;
  
  const isActive = listing.status === 'active';
  const isOutOfStock = listing.status === 'out_of_stock';
  const isBoosted = listing.boosted_until && new Date(listing.boosted_until) > new Date();
  const boostEndDate = listing.boosted_until ? new Date(listing.boosted_until) : null;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-[#1a1a1a] mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Geri Dön</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="relative h-96 bg-gray-100">
                {listing.image_url ? (
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
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
            <div className="bg-white border border-gray-200 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm font-semibold">
                  {getCategoryLabel()}
                </span>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(listing.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>

              {/* Boost Badge */}
              {isBoosted && (
                <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-[1.5rem] shadow-sm">
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold">⚡ Öne Çıkan İlan</span>
                </div>
              )}

              <h1 className="text-4xl font-bold text-[#1a1a1a] mb-4">{listing.title}</h1>

              {/* Boost Timer for Owner */}
              {isOwner && isBoosted && boostEndDate && (
                <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-[1.5rem]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-700">Boost Aktif</p>
                      <p className="text-sm text-purple-600">
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
                  <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Teknik Özellikler</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {listing.mileage !== null && (
                      <div className="bg-gray-50 rounded-[1.5rem] p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <MapPin className="w-5 h-5" />
                          <span className="text-sm font-medium">Kilometre</span>
                        </div>
                        <p className="text-2xl font-bold text-[#1a1a1a]">
                          {listing.mileage.toLocaleString()} km
                        </p>
                      </div>
                    )}
                    {listing.speed !== null && (
                      <div className="bg-gray-50 rounded-[1.5rem] p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                          <Gauge className="w-5 h-5" />
                          <span className="text-sm font-medium">Maksimum Hız</span>
                        </div>
                        <p className="text-2xl font-bold text-[#1a1a1a]">
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
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-200">
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Fiyat</p>
                  <p className="text-4xl font-bold text-[#1a1a1a]">
                    ${listing.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {isOwner && isActive && (
                  <button
                    onClick={() => setShowBoostModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-[1.5rem] hover:shadow-lg transition-all font-semibold text-lg mb-4"
                  >
                    <Rocket className="w-5 h-5" />
                    <span>🚀 İlanı Öne Çıkar</span>
                  </button>
                )}

                {canManage && (
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => navigate(`/listing/${listing.id}/edit`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-[1.5rem] hover:bg-blue-100 transition-colors font-semibold"
                    >
                      <Edit className="w-5 h-5" />
                      <span>Düzenle</span>
                    </button>
                    <button
                      onClick={handleDeleteListing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-[1.5rem] hover:bg-red-100 transition-colors font-semibold"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Sil</span>
                    </button>
                  </div>
                )}

                {!isOwner && (isActive || isOutOfStock) && (
                  <>
                    <button
                      onClick={() => setShowContactModal(true)}
                      disabled={isOutOfStock}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-[1.5rem] transition-all font-semibold text-lg mb-3 ${
                        isOutOfStock
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg'
                      }`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{isOutOfStock ? 'Stokta Yok' : 'İletişime Geç'}</span>
                    </button>
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 text-orange-600 rounded-[1.5rem] hover:bg-orange-100 transition-colors font-semibold"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <span>İlanı Şikayet Et</span>
                    </button>
                  </>
                )}

                {!isOwner && !isActive && !isOutOfStock && (
                  <div className="w-full px-6 py-4 bg-gray-100 text-gray-500 rounded-[1.5rem] text-center font-semibold text-lg">
                    Bu İlan Pasif
                  </div>
                )}
              </div>

              {/* Seller Card - Show shop if available, otherwise show individual seller */}
              {shop ? (
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">Mağaza Bilgileri</h3>
                  
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
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">Satıcı Bilgileri</h3>
                  
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

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <span>İlanı Şikayet Et</span>
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Bu ilanla ilgili bir sorun mu var? Lütfen şikayet nedeninizi belirtin.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şikayet Nedeni
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Bir neden seçin...</option>
                <option value="Sahte İlan">Sahte İlan</option>
                <option value="Yanıltıcı Fiyat">Yanıltıcı Fiyat</option>
                <option value="Uygunsuz İçerik">Uygunsuz İçerik</option>
                <option value="Dolandırıcılık">Dolandırıcılık</option>
                <option value="Yanlış Kategori">Yanlış Kategori</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmitReport}
                disabled={!reportReason}
                className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-xl hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Şikayeti Gönder
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
