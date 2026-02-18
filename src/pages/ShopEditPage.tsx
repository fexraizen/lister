import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Navbar } from '../components/layout/Navbar';
import { getShopById, updateShop, getUserRoleInShop, getShopMembersList, addShopMember, removeShopMember, type ShopMember } from '../lib/shops';
import { Store, Phone, FileText, Image, Save, ArrowLeft, Users, Mail, Trash2, UserPlus } from 'lucide-react';

export function ShopEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [phone, setPhone] = useState('');

  // Members management
  const [members, setMembers] = useState<ShopMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  useEffect(() => {
    if (!user || !id) {
      navigate('/auth');
      return;
    }

    loadShop();
    loadMembers();
  }, [user, id, navigate]);

  const loadShop = async () => {
    if (!user || !id) return;

    try {
      setLoading(true);
      
      // Check if user has permission
      const role = await getUserRoleInShop(user.id, id);
      if (!role) {
        showToast('Bu mağazayı düzenleme yetkiniz yok', 'error');
        navigate('/shop/manage');
        return;
      }

      const shop = await getShopById(id);
      if (!shop) {
        showToast('Mağaza bulunamadı', 'error');
        navigate('/shop/manage');
        return;
      }

      setName(shop.name);
      setDescription(shop.description || '');
      setLogoUrl(shop.logo_url || '');
      setPhone(shop.phone || '');
    } catch (err) {
      console.error('Failed to load shop:', err);
      showToast('Mağaza yüklenemedi', 'error');
      navigate('/shop/manage');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!id) return;
    try {
      const shopMembers = await getShopMembersList(id);
      setMembers(shopMembers);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setAddingMember(true);

    if (!id || !newMemberEmail) return;

    try {
      const { error: addError } = await addShopMember(id, newMemberEmail, 'editor');
      
      if (addError) {
        setMemberError(addError);
      } else {
        setNewMemberEmail('');
        await loadMembers();
        showToast('Yönetici başarıyla eklendi!', 'success');
      }
    } catch (err: any) {
      setMemberError(err.message || 'Yönetici eklenemedi');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    showConfirm({
      title: 'Yönetici Çıkar',
      message: 'Bu yöneticiyi mağazadan çıkarmak istediğinizden emin misiniz?',
      confirmText: 'Çıkar',
      cancelText: 'İptal',
      onConfirm: async () => {
        try {
          await removeShopMember(memberId);
          await loadMembers();
          showToast('Yönetici başarıyla çıkarıldı', 'success');
        } catch (err: any) {
          showToast(err.message || 'Yönetici çıkarılamadı', 'error');
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    if (!id) return;

    // Validation
    if (!name || name.length < 3) {
      setError('Mağaza adı en az 3 karakter olmalıdır');
      setSaving(false);
      return;
    }

    try {
      const { error: updateError } = await updateShop(id, {
        name,
        description,
        logo_url: logoUrl,
        phone,
      });

      if (updateError) throw new Error(updateError);

      setSuccess(true);
      setTimeout(() => {
        navigate('/shop/manage');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Mağaza güncellenemedi');
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
            <p className="mt-4 text-gray-600">Mağaza yükleniyor...</p>
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

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">
              Mağaza Düzenle
            </h1>
            <p className="text-lg text-gray-600">
              Mağaza bilgilerinizi ve yöneticilerinizi yönetin
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                <span>Mağaza Bilgileri</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'members'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Yöneticiler ({members.length})</span>
              </div>
            </button>
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
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
                    ✓ Mağaza başarıyla güncellendi! Yönlendiriliyorsunuz...
                  </p>
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
                    disabled={saving}
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
                    disabled={saving}
                  />
                </div>
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
                    disabled={saving}
                  />
                </div>
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
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Submit Button */}
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
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Mağaza Yöneticileri</h2>

              {/* Add Member Form */}
              <form onSubmit={handleAddMember} className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <UserPlus className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-bold text-blue-900">Yeni Yönetici Ekle</h3>
                </div>

                {memberError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{memberError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="kullanici@email.com"
                      disabled={addingMember}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                  >
                    {addingMember ? 'Ekleniyor...' : 'Ekle'}
                  </button>
                </div>
                <p className="mt-2 text-sm text-blue-700">
                  Yöneticiler mağaza adına ilan oluşturabilir ve mağazayı yönetebilir
                </p>
              </form>

              {/* Members List */}
              <div className="space-y-3">
                {members.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Henüz yönetici eklenmemiş</p>
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{member.user_id}</p>
                          <p className="text-sm text-gray-600">
                            {member.role === 'owner' ? 'Sahip' : 'Yönetici'}
                          </p>
                        </div>
                      </div>
                      {member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Çıkar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
