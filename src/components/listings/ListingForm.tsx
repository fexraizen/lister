import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import { getUserShops, getShopById, type Shop } from '../../lib/shops';
import { useNavigate } from 'react-router-dom';
import { DollarSign } from 'lucide-react';

type Category = 'vehicle' | 'real_estate' | 'item' | 'service';

interface ListingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ListingForm({ onSuccess, onCancel }: ListingFormProps) {
  const { user, profile } = useAuth();
  const { showToast, showConfirm } = useNotification();
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [sellerType, setSellerType] = useState<'individual' | 'shop'>('individual');
  const [selectedShopId, setSelectedShopId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<Category>('item');
  const [imageUrl, setImageUrl] = useState('');
  const [mileage, setMileage] = useState('');
  const [speed, setSpeed] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const LISTING_FEE = 100;

  useEffect(() => {
    if (user) {
      loadUserShops();
    }
  }, [user]);

  const loadUserShops = async () => {
    if (!user) return;
    try {
      const userShops = await getUserShops(user.id);
      console.log('📋 Loaded user shops:', userShops.map(s => ({ id: s.id, name: s.name })));
      
      // Validate each shop exists (for debugging)
      for (const shop of userShops) {
        const shopExists = await getShopById(shop.id);
        if (!shopExists) {
          console.warn(`⚠️ Shop ${shop.id} not found in storage`);
        }
      }
      
      setShops(userShops);
      if (userShops.length > 0) {
        setSelectedShopId(userShops[0].id);
        console.log('✅ Default shop selected:', userShops[0].id);
      }
    } catch (err) {
      console.error('❌ Failed to load shops:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check balance first
    if (!profile || profile.balance < LISTING_FEE) {
      showToast(`İlan yayınlamak için bakiyeniz yetersiz ($${LISTING_FEE}). Lütfen bakiye yükleyin.`, 'error');
      setLoading(false);
      return;
    }

    // Check if shop is selected when seller type is shop
    if (sellerType === 'shop') {
      if (shops.length === 0) {
        setError('Mağaza üzerinden ilan vermek için önce bir mağaza oluşturmalısınız');
        setLoading(false);
        return;
      }

      if (!selectedShopId) {
        setError('Lütfen bir mağaza seçin');
        setLoading(false);
        return;
      }
    }

    // Validation
    if (!title || !description || !price) {
      setError('Başlık, açıklama ve fiyat zorunludur');
      setLoading(false);
      return;
    }

    if (title.length < 3 || title.length > 100) {
      setError('Başlık 3 ile 100 karakter arasında olmalıdır');
      setLoading(false);
      return;
    }

    if (description.length < 10) {
      setError('Açıklama en az 10 karakter olmalıdır');
      setLoading(false);
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Fiyat pozitif bir sayı olmalıdır');
      setLoading(false);
      return;
    }

    if (category === 'vehicle') {
      if (!mileage || !speed) {
        setError('Araç kategorisi için kilometre ve hız bilgisi zorunludur');
        setLoading(false);
        return;
      }
      const mileageNum = parseInt(mileage);
      const speedNum = parseInt(speed);
      if (isNaN(mileageNum) || mileageNum < 0) {
        setError('Kilometre negatif olamaz');
        setLoading(false);
        return;
      }
      if (isNaN(speedNum) || speedNum < 0) {
        setError('Hız negatif olamaz');
        setLoading(false);
        return;
      }
    }

    try {
      // Step 1: Charge listing fee
      const { data: feeResult, error: feeError } = await supabase.rpc('charge_listing_fee', {
        p_user_id: user?.id,
        p_fee: LISTING_FEE
      });

      if (feeError) {
        console.error('❌ Fee charge error:', feeError);
        throw new Error('İlan ücreti alınamadı. Lütfen tekrar deneyin.');
      }

      if (!feeResult.success) {
        throw new Error(feeResult.error || 'İlan ücreti alınamadı');
      }

      console.log('✅ Listing fee charged successfully. New balance:', feeResult.new_balance);

      // Step 2: Create listing
      const listingData: any = {
        user_id: user?.id,
        shop_id: sellerType === 'shop' ? selectedShopId : null,
        title,
        description,
        price: priceNum,
        category,
        image_url: imageUrl || null,
        status: 'active',
      };

      // Validate shop_id is UUID if provided
      if (listingData.shop_id) {
        console.log('🔍 Validating shop ID:', listingData.shop_id);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(listingData.shop_id)) {
          console.error('❌ Invalid shop ID format:', listingData.shop_id);
          setError('Geçersiz mağaza ID formatı. Lütfen sayfayı yenileyin ve tekrar deneyin.');
          setLoading(false);
          return;
        }
        
        // Verify shop exists in localStorage
        const shopExists = await getShopById(listingData.shop_id);
        if (!shopExists) {
          console.error('❌ Shop not found in storage:', listingData.shop_id);
          setError('Seçilen mağaza bulunamadı. Lütfen mağaza listesini yenileyin.');
          setLoading(false);
          return;
        }
        
        console.log('✅ Shop ID format valid and shop exists');
      }

      if (category === 'vehicle') {
        listingData.mileage = parseInt(mileage);
        listingData.speed = parseInt(speed);
      }

      console.log('📤 Creating listing with data:', {
        ...listingData,
        category: `${category} (English format for DB)`,
        shop_id: listingData.shop_id ? `${listingData.shop_id} (UUID validated)` : 'null'
      });

      const { error: insertError } = await supabase
        .from('listings')
        .insert(listingData);

      if (insertError) {
        console.error('❌ Database error:', insertError);
        
        // User-friendly error messages
        if (insertError.message.includes('invalid input syntax for type uuid')) {
          throw new Error('Mağaza ID formatı geçersiz. Lütfen sayfayı yenileyin ve tekrar deneyin.');
        } else if (insertError.message.includes('foreign key') || insertError.message.includes('violates foreign key constraint')) {
          throw new Error('Seçilen mağaza sistemde bulunamadı. Lütfen başka bir mağaza seçin veya sayfayı yenileyin.');
        } else if (insertError.message.includes('listings_category_check') || insertError.message.includes('check constraint')) {
          throw new Error('Lütfen geçerli bir kategori seçin.');
        } else {
          throw new Error(insertError.message);
        }
      }

      console.log('✅ Listing created successfully');
      showToast(`İlan yayına alındı! (-$${LISTING_FEE})`, 'success');
      onSuccess?.();
    } catch (err: any) {
      console.error('❌ Creation failed:', err);
      setError(err.message || 'İlan oluşturulamadı. Lütfen tekrar deneyin.');
      showToast(err.message || 'İlan oluşturulamadı', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Yeni İlan Oluştur</h2>
      
      {/* Listing Fee Info */}
      <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-blue-900 mb-1">İlan Yayınlama Ücreti</p>
            <p className="text-sm text-blue-700">
              İlanınızı yayınlamak için <strong>${LISTING_FEE}</strong> ücret alınacaktır.
            </p>
            {profile && (
              <p className="text-sm text-blue-600 mt-1">
                Mevcut Bakiyeniz: <strong>${profile.balance.toFixed(2)}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Seller Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Satıcı Türü *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSellerType('individual')}
              className={`px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                sellerType === 'individual'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
              disabled={loading}
            >
              Bireysel
            </button>
            <button
              type="button"
              onClick={() => setSellerType('shop')}
              className={`px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                sellerType === 'shop'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
              disabled={loading}
            >
              Mağaza Üzerinden
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {sellerType === 'individual' 
              ? 'İlan kişisel profiliniz adına yayınlanacak' 
              : 'İlan seçtiğiniz mağaza adına yayınlanacak'}
          </p>
        </div>

        {/* Shop Selection - Only show if seller type is shop */}
        {sellerType === 'shop' && (
          shops.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 mb-3">
                Mağaza üzerinden ilan vermek için önce bir mağaza oluşturmalısınız.
              </p>
              <button
                type="button"
                onClick={() => navigate('/shop/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Mağaza Oluştur
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="shop" className="block text-sm font-medium text-gray-700 mb-1">
                Mağaza *
              </label>
              <select
                id="shop"
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">İlanınız bu mağaza adına yayınlanacak</p>
            </div>
          )
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Başlık *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="İlan başlığını girin"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">3-100 karakter arası</p>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Kategori *
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="item">Ürün</option>
            <option value="vehicle">Araç</option>
            <option value="real_estate">Emlak</option>
            <option value="service">Hizmet</option>
          </select>
        </div>

        {category === 'vehicle' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
                Kilometre *
              </label>
              <input
                id="mileage"
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="speed" className="block text-sm font-medium text-gray-700 mb-1">
                Maksimum Hız (km/s) *
              </label>
              <input
                id="speed"
                type="number"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Açıklama *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="İlanınızı detaylı açıklayın..."
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">Minimum 10 karakter</p>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Fiyat ($) *
          </label>
          <input
            id="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            step="0.01"
            min="0"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Görsel URL (opsiyonel)
          </label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || (sellerType === 'shop' && shops.length === 0)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Oluşturuluyor...' : 'İlan Oluştur'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              İptal
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
