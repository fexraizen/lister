import { useState, useEffect } from 'react';
import { X, Rocket } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { getSystemSettings, calculateFinalPrice } from '../../lib/systemSettings';

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

export function BoostModal({ listingId, isOpen, onClose, onSuccess }: BoostModalProps) {
  const { showToast } = useNotification();
  const [selectedOption, setSelectedOption] = useState<BoostOption | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [discountRate, setDiscountRate] = useState(0);
  const [boostOptions, setBoostOptions] = useState<BoostOption[]>([]);

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      const settings = await getSystemSettings();
      setDiscountRate(settings.global_discount_rate);
      
      // Calculate final boost prices with discount
      const finalBoost24h = calculateFinalPrice(settings.boost_fee_24h, settings.global_discount_rate);
      const finalBoost7d = calculateFinalPrice(settings.boost_fee_7d, settings.global_discount_rate);
      
      // Create boost options with dynamic pricing
      const options: BoostOption[] = [
        { 
          duration: '24 saat', 
          hours: 24, 
          cost: finalBoost24h, 
          label: `24 Saat - ${finalBoost24h.toFixed(2)}` 
        },
        { 
          duration: '1 hafta', 
          hours: 168, 
          cost: finalBoost7d, 
          label: `1 Hafta - ${finalBoost7d.toFixed(2)}` 
        },
      ];
      
      setBoostOptions(options);
    } catch (error) {
      console.error('Error loading system settings:', error);
      // Fallback to default options
      setBoostOptions([
        { duration: '24 saat', hours: 24, cost: 15, label: '24 Saat - $15' },
        { duration: '1 hafta', hours: 168, cost: 50, label: '1 Hafta - $50' },
      ]);
    }
  };

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
          {boostOptions.map((option) => (
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
                  {discountRate > 0 && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      %{discountRate} indirim uygulandı!
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {discountRate > 0 && (
                    <p className="text-sm text-gray-400 line-through">
                      ${(option.cost / (1 - discountRate / 100)).toFixed(2)}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-gray-900">
                    ${option.cost.toFixed(2)}
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
