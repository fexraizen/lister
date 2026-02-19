import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/layout/Navbar';
import { Send, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { sendNotification, NotificationTemplates } from '../lib/notificationService';
import type { Database } from '../lib/database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  listing?: {
    id: string;
    title: string;
    image_url: string | null;
    price: number;
  };
  buyer?: {
    id: string;
    username: string;
  };
  seller?: {
    id: string;
    username: string;
  };
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unreadCount?: number;
};

type Message = Database['public']['Tables']['messages']['Row'];

export function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load conversations only once on mount
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1. Fetch raw conversations data (no joins)
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;
      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // 2. Collect unique user IDs and listing IDs
      const userIds = new Set<string>();
      const listingIds = new Set<string>();
      
      conversationsData.forEach(conv => {
        userIds.add(conv.buyer_id);
        userIds.add(conv.seller_id);
        listingIds.add(conv.listing_id);
      });

      // 3. Fetch all users in one query
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', Array.from(userIds));

      // 4. Fetch all listings in one query
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, image_url, price')
        .in('id', Array.from(listingIds));

      // 5. Create lookup maps
      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
      const listingsMap = new Map(listingsData?.map(l => [l.id, l]) || []);

      // 6. Load last message and unread count for each conversation
      const conversationsWithDetails = await Promise.all(
        conversationsData.map(async (conv) => {
          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          // 7. Manually attach related data
          return {
            ...conv,
            listing: listingsMap.get(conv.listing_id),
            buyer: usersMap.get(conv.buyer_id),
            seller: usersMap.get(conv.seller_id),
            lastMessage: lastMsg || undefined,
            unreadCount: count || 0,
          };
        })
      );

      setConversations(conversationsWithDetails as Conversation[]);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      // Update unread count in local state instead of reloading all conversations
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, [user]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversations only once on mount
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadConversations();
  }, [user?.id, navigate, loadConversations]);

  // Select conversation when URL changes
  useEffect(() => {
    if (id && conversations.length > 0) {
      const conv = conversations.find(c => c.id === id);
      if (conv) {
        setSelectedConversation(conv);
        loadMessages(id);
      }
    }
  }, [id, conversations.length, loadMessages]);

  // Scroll to bottom and mark as read when messages change
  useEffect(() => {
    if (messages.length > 0 && selectedConversation) {
      scrollToBottom();
      markMessagesAsRead(selectedConversation.id);
    }
  }, [messages.length, selectedConversation?.id, scrollToBottom, markMessagesAsRead]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          setMessages(prev => {
            // Prevent duplicate messages (if already added by handleSendMessage)
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic update - add message to local state immediately
      if (data) {
        setMessages(prev => [...prev, data]);
        scrollToBottom();
      }

      setNewMessage('');

      // Send notification to the other user
      const recipientId = selectedConversation.buyer_id === user.id 
        ? selectedConversation.seller_id 
        : selectedConversation.buyer_id;

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (senderProfile && selectedConversation.listing) {
        const notification = NotificationTemplates.newMessage(
          senderProfile.username,
          selectedConversation.listing.title
        );
        await sendNotification(recipientId, notification.title, notification.message);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (conv: Conversation) => {
    if (!user) return null;
    return conv.buyer_id === user.id ? conv.seller : conv.buyer;
  };

  if (!user) return null;

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-140px)] flex">
          {/* Left Panel - Conversations List */}
          <div className="w-full md:w-1/3 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Mesajlar</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-600">Henüz mesajınız yok</p>
                  <p className="text-sm text-slate-500 mt-2">
                    İlan sahipleriyle iletişime geçerek mesajlaşmaya başlayın
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const otherUser = getOtherUser(conv);
                  const isSelected = selectedConversation?.id === conv.id;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv);
                        navigate(`/messages/${conv.id}`);
                        loadMessages(conv.id);
                      }}
                      className={`w-full p-4 flex gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${
                        isSelected ? 'bg-emerald-50' : ''
                      }`}
                    >
                      {/* Listing Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                        {conv.listing?.image_url ? (
                          <img
                            src={conv.listing.image_url}
                            alt={conv.listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Conversation Info */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-slate-900 truncate">
                            {otherUser?.username || 'Kullanıcı'}
                          </p>
                          {conv.unreadCount! > 0 && (
                            <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 truncate mb-1">
                          {conv.listing?.title}
                        </p>
                        {conv.lastMessage && (
                          <p className="text-xs text-slate-500 truncate">
                            {conv.lastMessage.sender_id === user.id ? 'Siz: ' : ''}
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Messages */}
          <div className="hidden md:flex md:w-2/3 flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedConversation(null);
                      navigate('/messages');
                    }}
                    className="md:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                    {selectedConversation.listing?.image_url ? (
                      <img
                        src={selectedConversation.listing.image_url}
                        alt={selectedConversation.listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {getOtherUser(selectedConversation)?.username || 'Kullanıcı'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {selectedConversation.listing?.title}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      ${selectedConversation.listing?.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === user.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isMine
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMine ? 'text-emerald-100' : 'text-slate-500'
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 px-4 py-2.5 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-full font-medium shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-600 text-lg mb-2">Mesajlaşmaya başlayın</p>
                  <p className="text-slate-500 text-sm">
                    Soldaki listeden bir sohbet seçin
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
