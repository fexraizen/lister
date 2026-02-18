import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Navbar } from '../components/layout/Navbar';
import { supabase } from '../lib/supabase';
import { getUserShops, getUserRoleInShop, getShopById, type Shop } from '../lib/shops';
import { ArrowLeft, Save, CheckCircle, XCircle, PackageX } from 'lucide-react';

type Category = 'vehicle' | 'real_estate' | 'item' | 'service';

export function ListingEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [canEdit, setCanEdit] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<Category>('item');
  const [imageUrl, setImageUrl] = useState('');
  const [mileage, setMileage] = useState('');
  const [speed, setSpeed] = useState('');
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [newShopId, setNewShopId] = useState<string>('');
  const [transferToShop, setTransferToShop] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'active' | 'passive' | 'out_of_stock'>('active');

  useEffect(() => {
    if (!user || !id) {
      navigate('/auth');
      return;
    }

    loadListing();
    loadUserShops();
  }, [user, id, navigate]);

  const loadUserShops = async () => {
    if (!user) return;
    try {
      const userShops = await getUserShops(user.id);
      console.log('📋 Loaded user shops:', userShops.map(s => ({ id: s.id, name: s.name })));
      
      // Validate each shop exists
      for (const shop of userShops) {
        const shopExists = await getShopById(shop.id);
        if (!shopExists) {
          console.warn(`⚠️ Shop ${shop.id} not found in storage`);
        }
      }
      
      setShops(userShops);
    } catch (err) {
      console.error('❌ Failed to load shops:', err);
    }
  };

  const loadListing = async () => {
    if (!user || !id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Check if user can edit this listing
      const isOwner = data.user_id === user.id;
      let hasShopPermission = false;

      if (data.shop_id) {
        const role = await getUserRoleInShop(user.id, data.shop_id);
        hasShopPermission = role !== null;
      }

      // Check if user is admin/moderator
      const isAdminOrModerator = profile?.role === 'admin' || 
                                 profile?.role === 'super_admin' || 
                                 profile?.role === 'moderator';

      const canManage = isOwner || hasShopPermission || isAdminOrModerator;

      if (!canManage) {
        showToast('Bu ilanı düzenleme yetkiniz yok', 'error');
        navigate('/');
        return;
      }

      setCanEdit(true);
      setTitle(data.title);
      setDescription(data.description);
      setPrice(data.price.toString());
      setCategory(data.category);
      setImageUrl(data.image_url || '');
      setMileage(data.mileage?.toString() || '');
      setSpeed(data.speed?.toString() || '');
      setCurrentShopId(data.shop_id);
      setNewShopId(data.shop_id || '');
      setCurrentStatus(data.status || 'active');
    } catch (err) {
      console.error('Failed to load listing:', err);
      showToast('İlan yüklenemedi', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'passive' | 'out_of_stock') => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setCurrentStatus(newStatus);
      const statusMessages = {
        active: 'İlan aktif duruma getirildi',
        passive: 'İlan pasif duruma getirildi',
        out_of_stock: 'İlan stokta yok olarak işaretlendi'
      };
      showToast(statusMessages[newStatus], 'success');
    } catch (err: any) {
      showToast(err.message || 'Durum güncellenemedi', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    if (!id) return;

    // Validation
    if (!title || !description || !price) {
      setError('Başlık, açıklama ve fiyat zorunludur');
      setSaving(false);
      return;
    }

    if (title.length < 3 || title.length > 100) {
      setError('Başlık 3 ile 100 karakter arasında olmalıdır');
      setSaving(false);
      return;
    }

    if (description.length < 10) {
      setError('Açıklama en az 10 karakter olmalıdır');
      setSaving(false);
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Fiyat pozitif bir sayı olmalıdır');
      setSaving(false);
      return;
    }

    if (category === 'vehicle') {
      if (!mileage || !speed) {
        setError('Araç kategorisi için kilometre ve hız bilgisi zorunludur');
        setSaving(false);
        return;
      }
      const mileageNum = parseInt(mileage);
      const speedNum = parseInt(speed);
      if (isNaN(mileageNum) || mileageNum < 0) {
        setError('Kilometre negatif olamaz');
        setSaving(false);
        return;
      }
      if (isNaN(speedNum) || speedNum < 0) {
        setError('Hız negatif olamaz');
        setSaving(false);
        return;
      }
    }

    try {
      const updateData: any = {
        title,
        description,
        price: priceNum,
        category,
        image_url: imageUrl || null,
      };

      // Handle shop transfer - validate UUID format
      if (transferToShop && newShopId) {
        console.log('🔄 Transferring listing to shop:', newShopId);
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(newShopId)) {
          console.error('❌ Invalid shop ID format:', newShopId);
          setError('Geçersiz mağaza ID formatı. Lütfen sayfayı yenileyin ve tekrar deneyin.');
          setSaving(false);
          return;
        }
        console.log('✅ Shop ID format valid');
        
        // Verify shop exists
        const shopExists = await getShopById(newShopId);
        if (!shopExists) {
          console.error('❌ Shop not found in storage:', newShopId);
          setError('Seçilen mağaza bulunamadı. Lütfen mağaza listesini yenileyin.');
          setSaving(false);
          return;
        }
        console.log('✅ Shop exists in storage');
        
        updateData.shop_id = newShopId;
      }

      if (category === 'vehicle') {
        updateData.mileage = parseInt(mileage);
        updateData.speed = parseInt(speed);
      } else {
        updateData.mileage = null;
        updateData.speed = null;
      }

      // Log for debugging
      console.log('📤 Updating listing with data:', {
        ...updateData,
        category: `${category} (English format for DB)`,
        shop_id: updateData.shop_id ? `${updateData.shop_id} (UUID validated)` : 'null'
      });

      const { error: updateError } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('❌ Database error:', updateError);
        
        // User-friendly error messages
        if (updateError.message.includes('invalid input syntax for type uuid')) {
          throw new Error('Mağaza ID formatı geçersiz. Lütfen sayfayı yenileyin ve tekrar deneyin.');
        } else if (updateError.message.includes('foreign key') || updateError.message.includes('violates foreign key constraint')) {
          throw new Error('Seçilen mağaza sistemde bulunamadı. Lütfen başka bir mağaza seçin veya sayfayı yenileyin.');
        } else if (updateError.message.includes('listings_category_check') || updateError.message.includes('check constraint')) {
          throw new Error('Lütfen geçerli bir kategori seçin.');
        } else {
          throw new Error(updateError.message);
        }
      }

      console.log('✅ Listing updated successfully');
      showToast('İlan başarıyla güncellendi! 🎉', 'success');
      navigate('/my-listings');
    } catch (err: any) {
      console.error('❌ Update failed:', err);
      setError(err.message || 'İlan güncellenemedi. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
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

  if (!canEdit) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Geri Dön</span>
        </button>

        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">
            İlan Düzenle
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            İlan bilgilerinizi güncelleyin
          </p>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {/* Status Management */}
            <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">İlan Durumu</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleStatusChange('active')}
                  disabled={currentStatus === 'active'}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                    currentStatus === 'active'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-600 hover:text-green-600'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Aktif</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('out_of_stock')}
                  disabled={currentStatus === 'out_of_stock'}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                    currentStatus === 'out_of_stock'
                      ? 'bg-yellow-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-yellow-600 hover:text-yellow-600'
                  }`}
                >
                  <PackageX className="w-5 h-5" />
                  <span>Stokta Yok</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('passive')}
                  disabled={currentStatus === 'passive'}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                    currentStatus === 'passive'
                      ? 'bg-gray-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-600 hover:text-gray-600'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                  <span>Pasif</span>
                </button>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                {currentStatus === 'active' && '✅ İlan aktif ve görünür'}
                {currentStatus === 'out_of_stock' && '⚠️ İlan görünür ama "TÜKENDİ" etiketi ile gösterilir'}
                {currentStatus === 'passive' && '🔒 İlan gizli, sadece siz görebilirsiniz'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Shop Transfer Option */}
              {!currentShopId && shops.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transferToShop}
                      onChange={(e) => setTransferToShop(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-semibold text-blue-900">Bu ilanı bir mağazaya taşı</p>
                      <p className="text-sm text-blue-700">İlanınızı mağazanız adına yayınlayın</p>
                    </div>
                  </label>

                  {transferToShop && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mağaza Seçin
                      </label>
                      <select
                        value={newShopId}
                        onChange={(e) => setNewShopId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={transferToShop}
                      >
                        <option value="">Mağaza seçin...</option>
                        {shops.map((shop) => (
                          <option key={shop.id} value={shop.id}>
                            {shop.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                  Başlık *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="İlan başlığını girin"
                  disabled={saving}
                  required
                />
                <p className="mt-1.5 text-xs text-gray-500">3-100 karakter arası</p>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
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
                    <label htmlFor="mileage" className="block text-sm font-semibold text-gray-700 mb-2">
                      Kilometre *
                    </label>
                    <input
                      id="mileage"
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label htmlFor="speed" className="block text-sm font-semibold text-gray-700 mb-2">
                      Maksimum Hız (km/s) *
                    </label>
                    <input
                      id="speed"
                      type="number"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                      disabled={saving}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                  Açıklama *
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="İlanınızı detaylı açıklayın..."
                  disabled={saving}
                  required
                />
                <p className="mt-1.5 text-xs text-gray-500">Minimum 10 karakter</p>
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                  Fiyat ($) *
                </label>
                <input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={saving}
                  required
                />
              </div>

              <div>
                <label htmlFor="imageUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                  Görsel URL (opsiyonel)
                </label>
                <input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                  disabled={saving}
                />
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-lg"
                >
                  <Save className="w-5 h-5" />
                  <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
