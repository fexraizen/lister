import { useState } from 'react';
import { X, Rocket } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';

interface BoostModalProps {
  listingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BoostOption {
  duration: string;
  hours: number;
  cost: number;
  label: string;
}

const BOOST_OPTIONS: BoostOption[] = [
  { duration: '24 saat', hours: 24, cost: 1000, label: '24 Saat - $1,000' },
  { duration: '1 hafta', hours: 168, cost: 5000, label: '1 Hafta - $5,000' },
];

export function BoostModal({ listingId, isOpen, onClose, onSuccess }: BoostModalProps) {
  const { showToast } = useNotification();
  const [selectedOption, setSelectedOption] = useState<BoostOption | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!selectedOption) return;

    setPurchasing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('Giriş yapmalısınız', 'error');
        return;
      }

      const { error } = await supabase.rpc('purchase_boost', {
        p_listing_id: listingId,
        p_user_id: user.id,
        p_cost: selectedOption.cost,
        p_duration_hours: selectedOption.hours,
      });

      if (error) {
        throw error;
      }

      // No error means success
      showToast('🚀 İlan başarıyla öne çıkarıldı!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Boost satın alınamadı', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">İlanı Öne Çıkar</h2>
              <p className="text-sm text-gray-600">Boost satın al</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          İlanınızı öne çıkararak daha fazla görüntülenme elde edin. Öne çıkan ilanlar listelerin en üstünde görünür.
        </p>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {BOOST_OPTIONS.map((option) => (
            <button
              key={option.hours}
              onClick={() => setSelectedOption(option)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selectedOption?.hours === option.hours
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{option.duration}</p>
                  <p className="text-sm text-gray-600">Öne çıkarma süresi</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ${option.cost.toLocaleString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            İptal
          </button>
          <button
            onClick={handlePurchase}
            disabled={!selectedOption || purchasing}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
          >
            {purchasing ? 'İşleniyor...' : 'Satın Al'}
          </button>
        </div>
      </div>
    </div>
  );
}
