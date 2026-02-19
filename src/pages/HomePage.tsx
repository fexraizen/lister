import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { MarketplaceFeed } from '../components/marketplace/MarketplaceFeed';
import { Plus, Car, Home, Package2, Briefcase, TrendingUp, Shield, Zap, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SiteSettings {
  stats_security_rate: string;
  stats_security_text: string;
  stats_support_title: string;
  stats_approval_title: string;
}

export function HomePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [settings, setSettings] = useState<SiteSettings>({
    stats_security_rate: '99',
    stats_security_text: 'Güvenli',
    stats_support_title: 'Kesintisiz İletişim',
    stats_approval_title: 'Hızlı Onay',
  });

  // Fetch site settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings' as any)
          .select('key, value');

        if (error) throw error;

        if (data && data.length > 0) {
          const settingsObj: any = {};
          (data as any[]).forEach((item: any) => {
            settingsObj[item.key] = item.value;
          });
          setSettings({
            stats_security_rate: settingsObj.stats_security_rate || '99',
            stats_security_text: settingsObj.stats_security_text || 'Güvenli',
            stats_support_title: settingsObj.stats_support_title || 'Kesintisiz İletişim',
            stats_approval_title: settingsObj.stats_approval_title || 'Hızlı Onay',
          });
        }
      } catch (err) {
        console.error('Failed to fetch site settings:', err);
      }
    };

    fetchSettings();
  }, []);

  // Fetch active listings count
  useEffect(() => {
    const fetchListingsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        if (error) throw error;
        setActiveListingsCount(count || 0);
      } catch (err) {
        console.error('Failed to fetch listings count:', err);
        setActiveListingsCount(0);
      }
    };

    fetchListingsCount();
  }, []);

  // Count-up animation
  useEffect(() => {
    if (activeListingsCount === 0) return;

    const duration = 2000;
    const steps = 60;
    const increment = activeListingsCount / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= activeListingsCount) {
        setDisplayCount(activeListingsCount);
        clearInterval(timer);
      } else {
        setDisplayCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [activeListingsCount]);

  const handleCategoryClick = (category: string) => {
    const slugMap: Record<string, string> = {
      'vehicle': 'vehicles',
      'real_estate': 'real-estate',
      'item': 'items',
      'service': 'services',
    };
    navigate(`/category/${slugMap[category]}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-900 text-lg font-light">Yükleniyor...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-emerald-50">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="container mx-auto px-4 py-12 md:py-16 relative">
          <div className="text-center max-w-5xl mx-auto">
            <img 
              src="https://i.imgur.com/8VuKSmM.png" 
              alt="LISTER" 
              className="h-28 w-auto mx-auto mb-6 object-contain"
            />
            <p className="text-slate-700 mb-8 font-normal text-base tracking-wide">
              Araç · Emlak · Ürün · Hizmet
            </p>

            {user && (
              <button
                onClick={() => navigate('/listings/new')}
                className="group inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-[2rem] text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span>İlan Oluştur</span>
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 max-w-4xl mx-auto">
            {/* Active Listings */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-md text-center hover:-translate-y-1 transition-all duration-300 group">
              <div className="relative">
                <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <p className="text-2xl font-light text-slate-900 tabular-nums">
                {displayCount > 0 ? `${displayCount}+` : '...'}
              </p>
              <p className="text-xs text-slate-600 font-normal mt-1">Aktif İlan</p>
            </div>

            {/* Security */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-md text-center hover:-translate-y-1 transition-all duration-300 group">
              <div className="relative">
                <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <p className="text-2xl font-light text-slate-900">%{settings.stats_security_rate}</p>
              <p className="text-xs text-slate-600 font-normal mt-1">{settings.stats_security_text}</p>
            </div>

            {/* Fast Processing */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-md text-center hover:-translate-y-1 transition-all duration-300 group">
              <div className="relative">
                <Zap className="w-8 h-8 text-amber-500 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <p className="text-2xl font-light text-slate-900">{settings.stats_approval_title.split(' ')[0]}</p>
              <p className="text-xs text-slate-600 font-normal mt-1">{settings.stats_approval_title.split(' ').slice(1).join(' ') || 'Onay'}</p>
            </div>

            {/* 24/7 Support */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-md text-center hover:-translate-y-1 transition-all duration-300 group">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-rose-500 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <p className="text-2xl font-light text-slate-900">{settings.stats_support_title.split(' ')[0]}</p>
              <p className="text-xs text-slate-600 font-normal mt-1">{settings.stats_support_title.split(' ').slice(1).join(' ') || 'İletişim'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-light text-slate-900 mb-3">
            Kategoriler
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {/* Vehicles */}
          <button
            onClick={() => handleCategoryClick('vehicle')}
            className="group bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all duration-300 cursor-pointer text-left hover:-translate-y-1"
          >
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-normal text-slate-900 mb-2">Araçlar</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Otomobil, motosiklet ve ticari araçlar
            </p>
            <div className="mt-4 text-emerald-600 text-sm font-medium flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
              <span>Keşfet</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </div>
          </button>

          {/* Real Estate */}
          <button
            onClick={() => handleCategoryClick('real_estate')}
            className="group bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all duration-300 cursor-pointer text-left hover:-translate-y-1"
          >
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300">
              <Home className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-normal text-slate-900 mb-2">Emlak</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Konut, işyeri ve arsa ilanları
            </p>
            <div className="mt-4 text-emerald-600 text-sm font-medium flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
              <span>Keşfet</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </div>
          </button>

          {/* Items */}
          <button
            onClick={() => handleCategoryClick('item')}
            className="group bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all duration-300 cursor-pointer text-left hover:-translate-y-1"
          >
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300">
              <Package2 className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-normal text-slate-900 mb-2">Ürünler</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Elektronik, mobilya ve diğer ürünler
            </p>
            <div className="mt-4 text-emerald-600 text-sm font-medium flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
              <span>Keşfet</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </div>
          </button>

          {/* Services */}
          <button
            onClick={() => handleCategoryClick('service')}
            className="group bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all duration-300 cursor-pointer text-left hover:-translate-y-1"
          >
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300">
              <Briefcase className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-normal text-slate-900 mb-2">Hizmetler</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Profesyonel hizmet ve danışmanlık
            </p>
            <div className="mt-4 text-emerald-600 text-sm font-medium flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
              <span>Keşfet</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </div>
          </button>
        </div>

        {/* Marketplace Feed */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-light text-slate-900 mb-3">
              Öne Çıkan İlanlar
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto rounded-full"></div>
          </div>
          <MarketplaceFeed />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-900 font-normal mb-2">
            © 2024 LISTER
          </p>
          <p className="text-slate-600 text-sm">
            Güvenli ve Hızlı Alışveriş Platformu
          </p>
        </div>
      </footer>
    </div>
  );
}
