import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/layout/Navbar';
import { ArrowLeft, Send, User, Shield, X } from 'lucide-react';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: 'open' | 'answered' | 'closed';
  created_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);

  // Check if user is admin
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'moderator';

  useEffect(() => {
    if (id && user?.id) {
      fetchTicketData();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`ticket:${id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ticket_messages',
            filter: `ticket_id=eq.${id}`
          },
          () => {
            fetchMessages();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tickets',
            filter: `id=eq.${id}`
          },
          () => {
            fetchTicketData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicketData = async () => {
    if (!id || !user?.id) return;
    
    try {
      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (ticketError) throw ticketError;
      
      // Check if user owns this ticket or is admin
      if (ticketData.user_id !== user.id && !isAdmin) {
        navigate('/tickets');
        return;
      }

      setTicket(ticketData);
      
      // Fetch messages
      await fetchMessages();
    } catch (error) {
      console.error('Error fetching ticket:', error);
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || !user?.id) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: id,
          sender_id: user.id,
          message: newMessage.trim(),
          is_admin: isAdmin
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages();
      
      // If admin sent message and ticket is open, it will auto-update to 'answered' via trigger
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Mesaj gönderilirken bir hata oluştu.');
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!id || !user?.id || !isAdmin) return;
    
    if (!confirm('Bu talebi kapatmak istediğinizden emin misiniz?')) {
      return;
    }

    setClosingTicket(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'closed' })
        .eq('id', id);

      if (error) throw error;
      
      await fetchTicketData();
    } catch (error) {
      console.error('Error closing ticket:', error);
      alert('Talep kapatılırken bir hata oluştu.');
    } finally {
      setClosingTicket(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!id || !user?.id || !isAdmin) return;

    setClosingTicket(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'open' })
        .eq('id', id);

      if (error) throw error;
      
      await fetchTicketData();
    } catch (error) {
      console.error('Error reopening ticket:', error);
      alert('Talep yeniden açılırken bir hata oluştu.');
    } finally {
      setClosingTicket(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'order': return 'Sipariş';
      case 'listing': return 'İlan';
      case 'complaint': return 'Şikayet';
      case 'other': return 'Diğer';
      default: return category;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col max-w-4xl">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => navigate(isAdmin ? '/admin' : '/tickets')}
            className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{isAdmin ? 'Kontrol Merkezi' : 'Tüm Talepler'}</span>
          </button>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{ticket.subject}</h1>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="bg-slate-100 px-3 py-1 rounded-full">{getCategoryText(ticket.category)}</span>
                  <span className={`px-3 py-1 rounded-full font-medium ${
                    ticket.status === 'open' ? 'bg-amber-50 text-amber-700' :
                    ticket.status === 'answered' ? 'bg-blue-50 text-blue-700' :
                    'bg-green-50 text-green-700'
                  }`}>
                    {ticket.status === 'open' ? 'Açık' : ticket.status === 'answered' ? 'Yanıtlandı' : 'Kapalı'}
                  </span>
                  <span>{new Date(ticket.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
              
              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-2">
                  {ticket.status !== 'closed' ? (
                    <button
                      onClick={handleCloseTicket}
                      disabled={closingTicket}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>Talebi Kapat</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleReopenTicket}
                      disabled={closingTicket}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <span>Yeniden Aç</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.is_admin ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  msg.is_admin ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                  {msg.is_admin ? (
                    <Shield className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <User className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                
                <div className={`flex-1 max-w-[70%] ${msg.is_admin ? '' : 'flex flex-col items-end'}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.is_admin 
                      ? 'bg-emerald-50 border border-emerald-100' 
                      : 'bg-slate-100 border border-slate-200'
                  }`}>
                    <p className="text-sm font-medium text-slate-900 mb-1">
                      {msg.is_admin ? 'Destek Ekibi' : 'Siz'}
                    </p>
                    <p className="text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 px-2">
                    {new Date(msg.created_at).toLocaleString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {ticket.status !== 'closed' && (
            <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isAdmin ? "Kullanıcıya yanıt yazın..." : "Mesajınızı yazın..."}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-full font-medium shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span>Gönder</span>
                </button>
              </div>
            </form>
          )}

          {ticket.status === 'closed' && (
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <p className="text-center text-slate-600 text-sm">
                Bu talep kapatılmıştır. {isAdmin ? 'Yeniden açmak için yukarıdaki butonu kullanın.' : 'Yeni bir mesaj gönderemezsiniz.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
