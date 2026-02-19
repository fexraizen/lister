import { supabase } from './supabase';

/**
 * Send a notification to a specific user
 */
export const sendNotification = async (
  userId: string,
  title: string,
  message: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
        },
      ]);

    if (error) throw error;
  } catch (error) {
    console.error('BİLDİRİM HATASI (RLS Olabilir):', error);
    console.error('Hedef user_id:', userId);
    console.error('Bildirim başlığı:', title);
  }
};

/**
 * Send notifications to multiple users
 */
export const sendBulkNotifications = async (
  userIds: string[],
  title: string,
  message: string
): Promise<void> => {
  try {
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      title,
      message,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) throw error;
  } catch (error) {
    console.error('TOPLU BİLDİRİM HATASI (RLS Olabilir):', error);
    console.error('Hedef kullanıcı sayısı:', userIds.length);
    console.error('Bildirim başlığı:', title);
  }
};

/**
 * Notification templates for common actions
 */
export const NotificationTemplates = {
  // Ticket notifications
  ticketCreated: (ticketSubject: string) => ({
    title: 'Destek Talebiniz Alındı 📩',
    message: `"${ticketSubject}" konulu destek talebiniz başarıyla oluşturuldu. En kısa sürede yanıt vereceğiz.`,
  }),

  ticketReplied: (ticketSubject: string) => ({
    title: 'Destek Talebinize Yanıt Verildi 💬',
    message: `"${ticketSubject}" konulu destek talebinize yanıt verildi. Lütfen kontrol edin.`,
  }),

  ticketClosed: (ticketSubject: string) => ({
    title: 'Destek Talebiniz Kapatıldı ✅',
    message: `"${ticketSubject}" konulu destek talebiniz çözüldü ve kapatıldı.`,
  }),

  // Listing notifications
  listingCreated: (listingTitle: string) => ({
    title: 'İlanınız Yayında! 🎉',
    message: `"${listingTitle}" başlıklı ilanınız başarıyla oluşturuldu ve yayına alındı.`,
  }),

  listingBoosted: (listingTitle: string, duration: string) => ({
    title: 'İlanınız Öne Çıkarıldı! 🚀',
    message: `"${listingTitle}" ilanınız ${duration} boyunca öne çıkarıldı ve daha fazla görüntülenecek.`,
  }),

  listingReported: (listingTitle: string) => ({
    title: 'İlanınız Şikayet Edildi ⚠️',
    message: `"${listingTitle}" ilanınız hakkında bir şikayet alındı. İnceleme yapılacaktır.`,
  }),

  listingDeleted: (listingTitle: string) => ({
    title: 'İlanınız Silindi 🗑️',
    message: `"${listingTitle}" ilanınız yönetici tarafından silindi. Detaylar için destek ekibiyle iletişime geçin.`,
  }),

  // Balance notifications
  balanceAdded: (amount: number) => ({
    title: 'Bakiye Eklendi 💰',
    message: `Hesabınıza $${amount.toFixed(2)} bakiye eklendi.`,
  }),

  balanceDeducted: (amount: number, reason: string) => ({
    title: 'Bakiye Kullanıldı 💳',
    message: `${reason} için $${amount.toFixed(2)} bakiyenizden düşüldü.`,
  }),

  // Shop notifications
  shopCreated: (shopName: string) => ({
    title: 'Mağazanız Oluşturuldu! 🏪',
    message: `"${shopName}" mağazanız başarıyla oluşturuldu. Artık mağaza üzerinden ilan verebilirsiniz.`,
  }),

  shopVerified: (shopName: string) => ({
    title: 'Mağazanız Onaylandı! ✅',
    message: `"${shopName}" mağazanız doğrulandı ve onay rozeti aldı.`,
  }),

  shopStatusChanged: (shopName: string, status: string) => ({
    title: 'Mağaza Durumu Değişti 🔄',
    message: `"${shopName}" mağazanızın durumu "${status}" olarak güncellendi.`,
  }),

  // Admin notifications
  roleChanged: (newRole: string) => ({
    title: 'Rolünüz Değiştirildi 👤',
    message: `Hesap rolünüz "${newRole}" olarak güncellendi.`,
  }),

  accountVerified: () => ({
    title: 'Hesabınız Doğrulandı! ✅',
    message: 'Hesabınız doğrulandı ve onay rozeti aldınız.',
  }),

  accountBanned: () => ({
    title: 'Hesabınız Askıya Alındı ⛔',
    message: 'Hesabınız yönetici tarafından askıya alındı. Detaylar için destek ekibiyle iletişime geçin.',
  }),

  // Report notifications
  reportReceived: (listingTitle: string) => ({
    title: 'Şikayetiniz Alındı 📝',
    message: `"${listingTitle}" ilanı hakkındaki şikayetiniz alındı ve incelenecek.`,
  }),

  reportResolved: (listingTitle: string) => ({
    title: 'Şikayetiniz Çözüldü ✅',
    message: `"${listingTitle}" ilanı hakkındaki şikayetiniz incelendi ve çözüldü.`,
  }),

  // Favorite notifications
  favoriteListingPriceDropped: (listingTitle: string, oldPrice: number, newPrice: number) => ({
    title: 'Favori İlanınızda Fiyat Düştü! 🔥',
    message: `"${listingTitle}" ilanının fiyatı $${oldPrice.toFixed(2)}'den $${newPrice.toFixed(2)}'ye düştü!`,
  }),

  favoriteListingSold: (listingTitle: string) => ({
    title: 'Favori İlanınız Satıldı 😢',
    message: `"${listingTitle}" ilanı artık mevcut değil.`,
  }),

  // Message notifications
  newMessage: (senderName: string, listingTitle: string) => ({
    title: 'Yeni Mesaj 💬',
    message: `${senderName}, "${listingTitle}" ilanı hakkında size mesaj gönderdi.`,
  }),
};
