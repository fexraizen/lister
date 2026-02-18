import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/layout/Navbar';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, Save, ArrowLeft } from 'lucide-react';

export function ProfileEditPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (profile) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
      setPhone(profile.phone || '');
    }

    if (user.email) {
      setEmail(user.email);
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!user) return;

    // Validation
    if (!username || username.length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalıdır');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username,
          avatar_url: avatarUrl || null,
          phone: phone || null,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        window.location.reload(); // Reload to update auth context
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Profil güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
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
              Kişisel Bilgiler
            </h1>
            <p className="text-lg text-gray-600">
              Hesap bilgilerinizi ve profil ayarlarınızı yönetin
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

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm text-green-600">
                    ✓ Profil başarıyla güncellendi! Sayfa yenileniyor...
                  </p>
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Kullanıcı Adı *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="johndoe"
                    disabled={loading}
                    required
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Minimum 3 karakter
                </p>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Profil Fotoğrafı URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="https://example.com/avatar.jpg"
                  disabled={loading}
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Profil fotoğrafınızın URL adresi
                </p>
              </div>

              {/* Preview Avatar */}
              {avatarUrl && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl overflow-hidden">
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Önizleme</p>
                    <p className="text-xs text-gray-500">Profil fotoğrafınız böyle görünecek</p>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  İletişim Bilgileri
                </h3>
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-600 cursor-not-allowed"
                    disabled
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  E-posta adresi değiştirilemez
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Telefon Numarası
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
                  Kişisel iletişim numaranız
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
                  <span>{loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Info Card */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>Not:</strong> Profil bilgileriniz platformda görünecektir. 
              Mağaza oluşturmak için navbar'dan "Mağaza Oluştur" seçeneğini kullanın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
