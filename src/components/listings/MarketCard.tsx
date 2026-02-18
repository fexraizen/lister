// FINAL CLEANUP - NO HOOKS
// Force update for Vercel build
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getShopById, type Shop } from '../../lib/shops';
import { supabase } from '../../lib/supabase';
import { ContactModal } from './ContactModal';
import { Edit, Trash2, MessageCircle, Gauge, MapPin, Store as StoreIcon, User as UserIcon, Eye, Zap } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Listing = Database['public']['Tables']['listings']['Row'] & {
  profiles?: {
    username: string;
    store_name?: string | null;
  };
};

interface MarketCardProps {
  listing: Listing;
  onDelete?: (listingId: string) => void;
  onPurchaseSuccess?: () => void;
}

export function MarketCard({ listing, onDelete }: MarketCardProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [showContactModal, setShowContactModal] = useState(false);
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

  useEffect(() => {
    if (listing.shop_id) {
      loadShop();
    } else {
      loadSellerProfile();
    }
  }, [listing.shop_id, listing.user_id]);

  const loadShop = async () => {
    if (!listing.shop_id) return;
    const shopData = await getShopById(listing.shop_id);
    setShop(shopData);
  };

  const loadSellerProfile = async () => {
    if (!listing.user_id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, phone')
        .eq('id', listing.user_id)
        .single();
      
      if (!error && data) {
        setSellerProfile(data);
      }
    } catch (err) {
      console.error('Failed to load seller profile:', err);
    }
  };

  const handleCardClick = () => {
    navigate(`/listing/${listing.id}`);
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContactModal(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bu ilanı silmek istediğinizden emin misiniz?')) {
      onDelete?.(listing.id);
    }
  };

  const getCategoryLabel = () => {
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

  const getCategoryColor = () => {
    switch (listing.category) {
      case 'vehicle':
        return 'bg-blue-100 text-blue-700';
      case 'real_estate':
        return 'bg-green-100 text-green-700';
      case 'service':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-purple-100 text-purple-700';
    }
  };

  return (
    <>
      <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300">
        {/* Image */}
        <div 
          onClick={handleCardClick}
          className="relative h-56 bg-gray-100 overflow-hidden cursor-pointer"
        >
          {listing.image_url ? (
            <img
              src={listing.image_url}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-6xl opacity-20">
                {listing.category === 'vehicle' && '🚗'}
                {listing.category === 'real_estate' && '🏢'}
                {listing.category === 'service' && '💼'}
                {listing.category === 'item' && '📦'}
              </div>
            </div>
          )}
          
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-2xl font-bold">TÜKENDİ</span>
            </div>
          )}
          
          <div className={`absolute top-4 left-4 ${getCategoryColor()} px-3 py-1 rounded-full text-xs font-semibold`}>
            {getCategoryLabel()}
          </div>

          {isBoosted && (
            <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
              <Zap className="w-3 h-3" />
              <span>Öne Çıkan</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <h3 
            onClick={handleCardClick}
            className="text-xl font-bold text-gray-900 mb-2 cursor-pointer hover:text-blue-600 transition-colors"
          >
            {listing.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
            {listing.description}
          </p>

          {/* Category-specific fields */}
          {listing.category === 'vehicle' && (listing.mileage !== null || listing.speed !== null) && (
            <div className="flex gap-4 mb-4 pb-4 border-b border-gray-100">
              {listing.mileage !== null && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{listing.mileage.toLocaleString()} km</span>
                </div>
              )}
              {listing.speed !== null && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Gauge className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{listing.speed} km/s</span>
                </div>
              )}
            </div>
          )}

          {/* Seller info - Show shop if available, otherwise show individual seller */}
          {shop ? (
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
              <StoreIcon className="w-4 h-4 text-gray-400" />
              <span>{shop.name}</span>
            </div>
          ) : sellerProfile && (
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
              <UserIcon className="w-4 h-4 text-gray-400" />
              <span>{sellerProfile.username}</span>
            </div>
          )}

          {/* View count */}
          <div className="flex items-center gap-1.5 mb-4 text-sm text-gray-500">
            <Eye className="w-4 h-4" />
            <span>{listing.view_count.toLocaleString()} görüntülenme</span>
          </div>

          {/* Price */}
          <div className="mb-4">
            <div className="text-3xl font-bold text-gray-900">
              ${listing.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Actions */}
          {canManage ? (
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/listing/${listing.id}/edit`);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <Edit className="w-4 h-4" />
                <span>Düzenle</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sil</span>
              </button>
            </div>
          ) : (isActive || isOutOfStock) ? (
            <button
              onClick={handleContactClick}
              disabled={isOutOfStock}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold ${
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span>{isOutOfStock ? 'Stokta Yok' : 'İletişime Geç'}</span>
            </button>
          ) : (
            <button
              disabled
              className="w-full px-4 py-3 bg-gray-100 text-gray-400 rounded-xl cursor-not-allowed font-semibold"
            >
              Pasif
            </button>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        sellerName={sellerProfile?.username || 'Satıcı'}
        sellerPhone={shop?.phone || sellerProfile?.phone}
        shopName={shop?.name}
        isShop={!!shop}
      />
    </>
  );
}
