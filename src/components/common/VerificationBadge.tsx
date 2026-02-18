import { CheckCircle } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified: boolean;
  type: 'user' | 'shop';
  className?: string;
}

const TOOLTIP_TEXT = {
  user: 'Onaylı Satıcı',
  shop: 'Onaylı Mağaza',
};

export function VerificationBadge({ isVerified, type, className = '' }: VerificationBadgeProps) {
  if (!isVerified) return null;

  return (
    <div className={`inline-flex items-center ${className}`} title={TOOLTIP_TEXT[type]}>
      <CheckCircle className="w-5 h-5 text-blue-600 fill-blue-100" />
    </div>
  );
}
