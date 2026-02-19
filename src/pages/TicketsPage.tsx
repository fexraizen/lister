import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/layout/Navbar';
import { LifeBuoy, Plus, X, MessageCircle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  category: 'order' | 'listing' | 'complaint' | 'other';
  status: 'open' | 'answered' | 'closed';
  created_at: string;
  updated_at: string;
}

export function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'order' | 'listing' | 'complaint' | 'other'>('other');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !user?.id) return;

    setSubmitting(true);
    try {
      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          category,
          status: 'open'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create first message
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: message.trim(),
          is_admin: false
        });

      if (messageError) throw messageError;

      // Reset form and close modal
      setSubject('');
      setCategory('other');
      setMessage('');
      setShowCreateModal(false);
      
      // Refresh tickets
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Talep oluşturulurken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'answered':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'closed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Açık';
      case 'answered':
        return 'Yanıtlandı';
      case 'closed':
        return 'Kapalı';
      default:
        return status;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'order':
        return 'Sipariş';
      case 'listing':
        return 'İlan';
      case 'complaint':
        return 'Şikayet';
      case 'other':
        return 'Diğer';
      default:
        return category;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <LifeBuoy className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-900">Destek Taleplerim</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-full font-medium shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              <span>Yeni Talep</span>
            </button>
          </div>

          {/* Tickets List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-12 text-center">
              <LifeBuoy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Henüz destek talebiniz yok</h3>
              <p className="text-slate-600 mb-6">Bir sorun mu yaşıyorsunuz? Yeni bir destek talebi oluşturun.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-medium shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                <span>İlk Talebinizi Oluşturun</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:border-emerald-200 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(ticket.status)}
                        <h3 className="text-lg font-semibold text-slate-900">{ticket.subject}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="bg-slate-100 px-3 py-1 rounded-full">{getCategoryText(ticket.category)}</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        ticket.status === 'open' ? 'bg-amber-50 text-amber-700' :
                        ticket.status === 'answered' ? 'bg-blue-50 text-blue-700' :
                        'bg-green-50 text-green-700'
                      }`}>
                        {getStatusText(ticket.status)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Yeni Destek Talebi</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Konu
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Talebinizin konusunu yazın"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="other">Diğer</option>
                  <option value="order">Sipariş</option>
                  <option value="listing">İlan</option>
                  <option value="complaint">Şikayet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mesajınız
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Sorununuzu detaylı bir şekilde açıklayın..."
                  rows={6}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Gönderiliyor...' : 'Talep Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
