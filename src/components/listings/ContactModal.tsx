import { X, Phone, User, Store, MessageCircle } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerName: string;
  sellerPhone?: string | null;
  shopName?: string | null;
  isShop: boolean;
  onStartConversation?: () => void;
  isStartingConversation?: boolean;
}

export function ContactModal({ 
  isOpen, 
  onClose, 
  sellerName, 
  sellerPhone, 
  shopName, 
  isShop,
  onStartConversation,
  isStartingConversation = false
}: ContactModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Satıcı İletişim Bilgileri
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Seller/Shop Name */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="p-2 bg-white rounded-lg">
              {isShop ? (
                <Store className="w-5 h-5 text-gray-600" />
              ) : (
                <User className="w-5 h-5 text-gray-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {isShop ? 'Mağaza Adı' : 'Satıcı Adı'}
              </p>
              <p className="font-semibold text-gray-900 text-lg">
                {isShop ? shopName : sellerName}
              </p>
            </div>
          </div>

          {/* Phone Number */}
          {sellerPhone ? (
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Telefon Numarası</p>
                <a
                  href={`tel:${sellerPhone}`}
                  className="font-semibold text-green-700 text-lg hover:text-green-800 transition-colors"
                >
                  {sellerPhone}
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800">
                Satıcı telefon numarası paylaşmamış.
              </p>
            </div>
          )}

          {/* Note */}
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>Not:</strong> Lütfen bu ilanı <strong>LISTER</strong> üzerinden gördüğünüzü belirtiniz.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {onStartConversation && (
            <button
              onClick={onStartConversation}
              disabled={isStartingConversation}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{isStartingConversation ? 'Başlatılıyor...' : 'Sohbete Başla'}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className={`${onStartConversation ? 'flex-1' : 'w-full'} px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold`}
          >
            Kapat
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
