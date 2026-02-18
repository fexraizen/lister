import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Navbar } from '../components/layout/Navbar';
import { createShop } from '../lib/shops';
import { Store, Phone, FileText, Image, Save, ArrowLeft } from 'lucide-react';

export function ShopCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!user) return;

    // Validation
    if (!name || name.length < 3) {
      setError('Mağaza adı en az 3 karakter olmalıdır');
      setLoading(false);
      return;
    }

    try {
      const { error: createError } = await createShop({
        name,
        description,
        logo_url: logoUrl,
        phone,
        owner_id: user.id,
      });

      if (createError) throw new Error(createError);

      showToast('Mağaza başarıyla oluşturuldu! 🎉', 'success');
      navigate('/shop/manage');
    } catch (err: any) {
      setError(err.message || 'Mağaza oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

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

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">
              Mağaza Oluştur
            </h1>
            <p className="text-lg text-gray-600">
              Kurumsal mağazanızı oluşturun ve ürünlerinizi satmaya başlayın
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Shop Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mağaza Adı *
                </label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Örn: Premium Electronics Store"
                    disabled={loading}
                    required
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Minimum 3 karakter
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mağaza Açıklaması
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Mağazanız hakkında kısa bir açıklama yazın..."
                    disabled={loading}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Müşterilerinize mağazanızı tanıtın
                </p>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mağaza Logosu URL
                </label>
                <div className="relative">
                  <Image className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="https://example.com/logo.png"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Mağaza logonuzun URL adresi
                </p>
              </div>

              {/* Preview Logo */}
              {logoUrl && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Logo Önizleme</p>
                    <p className="text-xs text-gray-500">Mağaza logonuz böyle görünecek</p>
                  </div>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Kurumsal Telefon
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Örn: 5551234567"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Müşterilerinizin ulaşabileceği iletişim numarası
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-lg"
                >
                  <Save className="w-5 h-5" />
                  <span>{loading ? 'Oluşturuluyor...' : 'Mağaza Oluştur'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Info Card */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>Not:</strong> Mağaza oluşturduktan sonra, ilanlarınızı bu mağaza adına yayınlayabilirsiniz. 
              Mağaza yönetim panelinden ekip üyelerinize yetki verebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
