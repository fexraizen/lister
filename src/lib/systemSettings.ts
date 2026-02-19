import { supabase } from './supabase';

export interface SystemSettings {
  listing_fee: number;
  boost_fee_24h: number;
  boost_fee_7d: number;
  deposit_bonus_rate: number;
  global_discount_rate: number;
}

// Cache for system settings
let settingsCache: SystemSettings | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

/**
 * Fetch system settings from database with caching
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (settingsCache && (now - lastFetchTime) < CACHE_DURATION) {
    return settingsCache;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value');

    if (error) throw error;

    const settings: SystemSettings = {
      listing_fee: 10,
      boost_fee_24h: 15,
      boost_fee_7d: 50,
      deposit_bonus_rate: 0,
      global_discount_rate: 0,
    };

    if (data) {
      data.forEach((item: any) => {
        if (item.key in settings) {
          settings[item.key as keyof SystemSettings] = Number(item.value);
        }
      });
    }

    settingsCache = settings;
    lastFetchTime = now;
    
    return settings;
  } catch (error) {
    console.error('Error fetching system settings:', error);
    // Return defaults on error
    return {
      listing_fee: 10,
      boost_fee_24h: 15,
      boost_fee_7d: 50,
      deposit_bonus_rate: 0,
      global_discount_rate: 0,
    };
  }
}

/**
 * Calculate final price after applying global discount
 */
export function calculateFinalPrice(basePrice: number, discountRate: number): number {
  if (discountRate <= 0) return basePrice;
  const discount = (basePrice * discountRate) / 100;
  return Math.max(0, basePrice - discount);
}

/**
 * Calculate bonus amount for deposit
 */
export function calculateDepositBonus(amount: number, bonusRate: number): number {
  if (bonusRate <= 0) return 0;
  return (amount * bonusRate) / 100;
}

/**
 * Clear settings cache (call this after admin updates settings)
 */
export function clearSettingsCache(): void {
  settingsCache = null;
  lastFetchTime = 0;
}
