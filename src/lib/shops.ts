import { supabase } from './supabase';
import type { Database } from './database.types';

// Shop types from database
export type Shop = Database['public']['Tables']['shops']['Row'];
export type ShopInsert = Database['public']['Tables']['shops']['Insert'];
export type ShopMember = Database['public']['Tables']['shop_members']['Row'];
export type ShopMemberInsert = Database['public']['Tables']['shop_members']['Insert'];

// LocalStorage keys for caching
const SHOPS_STORAGE_KEY = 'lister_shops_cache';
const SHOP_MEMBERS_STORAGE_KEY = 'lister_shop_members_cache';

// Helper functions for localStorage caching
const getCachedShops = (): Shop[] => {
  try {
    const data = localStorage.getItem(SHOPS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setCachedShops = (shops: Shop[]) => {
  try {
    localStorage.setItem(SHOPS_STORAGE_KEY, JSON.stringify(shops));
  } catch (error) {
    console.warn('⚠️ Failed to cache shops:', error);
  }
};

const getCachedShopMembers = (): ShopMember[] => {
  try {
    const data = localStorage.getItem(SHOP_MEMBERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setCachedShopMembers = (members: ShopMember[]) => {
  try {
    localStorage.setItem(SHOP_MEMBERS_STORAGE_KEY, JSON.stringify(members));
  } catch (error) {
    console.warn('⚠️ Failed to cache shop members:', error);
  }
};

/**
 * Create a new shop in Supabase database
 * IMPORTANT: Writes to database FIRST, then updates cache
 */
export async function createShop(data: {
  name: string;
  description?: string;
  logo_url?: string;
  phone?: string;
  owner_id: string;
}) {
  console.log('🏪 Creating shop:', data.name);
  console.log('📤 Writing to Supabase database...');

  try {
    // Step 1: Insert shop into database
    const shopData: ShopInsert = {
      name: data.name,
      description: data.description || null,
      logo_url: data.logo_url || null,
      phone: data.phone || null,
      owner_id: data.owner_id,
    };

    const { data: newShop, error: shopError } = await supabase
      .from('shops')
      .insert(shopData)
      .select()
      .single();

    if (shopError) {
      console.error('❌ Database error (shops):', shopError);
      throw new Error(shopError.message);
    }

    console.log('✅ Shop created in database:', newShop.id);

    // Step 2: Insert shop member (owner) into database
    const memberData: ShopMemberInsert = {
      shop_id: newShop.id,
      user_id: data.owner_id,
      role: 'owner',
    };

    const { data: newMember, error: memberError } = await supabase
      .from('shop_members')
      .insert(memberData)
      .select()
      .single();

    if (memberError) {
      console.error('❌ Database error (shop_members):', memberError);
      // Try to rollback shop creation
      await supabase.from('shops').delete().eq('id', newShop.id);
      throw new Error(memberError.message);
    }

    console.log('✅ Shop member created in database:', newMember.id);

    // Step 3: Update cache ONLY after successful database writes
    const cachedShops = getCachedShops();
    cachedShops.push(newShop);
    setCachedShops(cachedShops);

    const cachedMembers = getCachedShopMembers();
    cachedMembers.push(newMember);
    setCachedShopMembers(cachedMembers);

    console.log('✅ Cache updated successfully');

    return { data: newShop, error: null };
  } catch (err: any) {
    console.error('❌ Shop creation failed:', err);
    return { 
      data: null, 
      error: err.message || 'Mağaza oluşturulamadı. Lütfen tekrar deneyin.' 
    };
  }
}

/**
 * Get all shops for a user from database (with cache fallback)
 */
export async function getUserShops(userId: string): Promise<Shop[]> {
  console.log('📋 Fetching user shops for:', userId);

  try {
    // Fetch from database
    const { data: members, error: membersError } = await supabase
      .from('shop_members')
      .select('shop_id')
      .eq('user_id', userId);

    if (membersError) {
      console.error('❌ Failed to fetch shop members:', membersError);
      // Fallback to cache
      const cachedMembers = getCachedShopMembers();
      const userShopIds = cachedMembers
        .filter(m => m.user_id === userId)
        .map(m => m.shop_id);
      const cachedShops = getCachedShops();
      return cachedShops.filter(s => userShopIds.includes(s.id));
    }

    const shopIds = members.map(m => m.shop_id);

    if (shopIds.length === 0) {
      console.log('ℹ️ No shops found for user');
      return [];
    }

    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('*')
      .in('id', shopIds);

    if (shopsError) {
      console.error('❌ Failed to fetch shops:', shopsError);
      // Fallback to cache
      const cachedShops = getCachedShops();
      return cachedShops.filter(s => shopIds.includes(s.id));
    }

    console.log('✅ Fetched', shops.length, 'shops from database');

    // Update cache
    setCachedShops(shops);

    return shops;
  } catch (err) {
    console.error('❌ Error fetching user shops:', err);
    // Fallback to cache
    const cachedMembers = getCachedShopMembers();
    const userShopIds = cachedMembers
      .filter(m => m.user_id === userId)
      .map(m => m.shop_id);
    const cachedShops = getCachedShops();
    return cachedShops.filter(s => userShopIds.includes(s.id));
  }
}

/**
 * Get a single shop by ID from database (with cache fallback)
 */
export async function getShopById(shopId: string): Promise<Shop | null> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (error) {
      console.warn('⚠️ Shop not found in database:', shopId);
      // Fallback to cache
      const cachedShops = getCachedShops();
      return cachedShops.find(s => s.id === shopId) || null;
    }

    return data;
  } catch (err) {
    console.error('❌ Error fetching shop:', err);
    // Fallback to cache
    const cachedShops = getCachedShops();
    return cachedShops.find(s => s.id === shopId) || null;
  }
}

/**
 * Update shop in database
 */
export async function updateShop(shopId: string, data: Partial<Shop>) {
  console.log('🔄 Updating shop:', shopId);

  try {
    const { data: updatedShop, error } = await supabase
      .from('shops')
      .update({
        name: data.name,
        description: data.description,
        logo_url: data.logo_url,
        phone: data.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to update shop:', error);
      throw new Error(error.message);
    }

    console.log('✅ Shop updated in database');

    // Update cache
    const cachedShops = getCachedShops();
    const index = cachedShops.findIndex(s => s.id === shopId);
    if (index !== -1) {
      cachedShops[index] = updatedShop;
      setCachedShops(cachedShops);
    }

    return { data: updatedShop, error: null };
  } catch (err: any) {
    console.error('❌ Shop update failed:', err);
    return { data: null, error: err.message || 'Mağaza güncellenemedi' };
  }
}

/**
 * Delete shop from database
 */
export async function deleteShop(shopId: string) {
  console.log('🗑️ Deleting shop:', shopId);

  try {
    // Delete shop members first (foreign key constraint)
    const { error: membersError } = await supabase
      .from('shop_members')
      .delete()
      .eq('shop_id', shopId);

    if (membersError) {
      console.error('❌ Failed to delete shop members:', membersError);
      throw new Error(membersError.message);
    }

    // Delete shop
    const { error: shopError } = await supabase
      .from('shops')
      .delete()
      .eq('id', shopId);

    if (shopError) {
      console.error('❌ Failed to delete shop:', shopError);
      throw new Error(shopError.message);
    }

    console.log('✅ Shop deleted from database');

    // Update cache
    const cachedShops = getCachedShops().filter(s => s.id !== shopId);
    setCachedShops(cachedShops);

    const cachedMembers = getCachedShopMembers().filter(m => m.shop_id !== shopId);
    setCachedShopMembers(cachedMembers);

    return { error: null };
  } catch (err: any) {
    console.error('❌ Shop deletion failed:', err);
    return { error: err.message || 'Mağaza silinemedi' };
  }
}

/**
 * Get user's role in a shop
 */
export async function getUserRoleInShop(userId: string, shopId: string): Promise<'owner' | 'editor' | null> {
  try {
    const { data, error } = await supabase
      .from('shop_members')
      .select('role')
      .eq('user_id', userId)
      .eq('shop_id', shopId)
      .single();

    if (error) {
      // Fallback to cache
      const cachedMembers = getCachedShopMembers();
      const member = cachedMembers.find(m => m.user_id === userId && m.shop_id === shopId);
      return member ? member.role : null;
    }

    return data.role;
  } catch (err) {
    console.error('❌ Error fetching user role:', err);
    return null;
  }
}

/**
 * Add a member to a shop
 */
export async function addShopMember(shopId: string, userEmail: string, role: 'editor' | 'owner' = 'editor') {
  console.log('👥 Adding shop member:', userEmail, 'to shop:', shopId);

  try {
    // In a real app, look up user by email
    // For now, we'll use the email as user_id (this should be fixed in production)
    const memberData: ShopMemberInsert = {
      shop_id: shopId,
      user_id: userEmail,
      role,
    };

    const { data: newMember, error } = await supabase
      .from('shop_members')
      .insert(memberData)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to add shop member:', error);
      if (error.code === '23505') {
        throw new Error('Bu kullanıcı zaten mağaza üyesi');
      }
      throw new Error(error.message);
    }

    console.log('✅ Shop member added to database');

    // Update cache
    const cachedMembers = getCachedShopMembers();
    cachedMembers.push(newMember);
    setCachedShopMembers(cachedMembers);

    return { data: newMember, error: null };
  } catch (err: any) {
    console.error('❌ Add shop member failed:', err);
    return { data: null, error: err.message || 'Üye eklenemedi' };
  }
}

/**
 * Get all members of a shop
 */
export async function getShopMembersList(shopId: string): Promise<ShopMember[]> {
  try {
    const { data, error } = await supabase
      .from('shop_members')
      .select('*')
      .eq('shop_id', shopId);

    if (error) {
      console.error('❌ Failed to fetch shop members:', error);
      // Fallback to cache
      const cachedMembers = getCachedShopMembers();
      return cachedMembers.filter(m => m.shop_id === shopId);
    }

    // Update cache
    setCachedShopMembers(data);

    return data;
  } catch (err) {
    console.error('❌ Error fetching shop members:', err);
    // Fallback to cache
    const cachedMembers = getCachedShopMembers();
    return cachedMembers.filter(m => m.shop_id === shopId);
  }
}

/**
 * Remove a member from a shop
 */
export async function removeShopMember(memberId: string) {
  console.log('🗑️ Removing shop member:', memberId);

  try {
    const { error } = await supabase
      .from('shop_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('❌ Failed to remove shop member:', error);
      throw new Error(error.message);
    }

    console.log('✅ Shop member removed from database');

    // Update cache
    const cachedMembers = getCachedShopMembers().filter(m => m.id !== memberId);
    setCachedShopMembers(cachedMembers);

    return { error: null };
  } catch (err: any) {
    console.error('❌ Remove shop member failed:', err);
    return { error: err.message || 'Üye silinemedi' };
  }
}

/**
 * Update a shop member's role
 */
export async function updateShopMemberRole(memberId: string, role: 'owner' | 'editor') {
  console.log('🔄 Updating shop member role:', memberId, 'to', role);

  try {
    const { data: updatedMember, error } = await supabase
      .from('shop_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to update shop member role:', error);
      throw new Error(error.message);
    }

    console.log('✅ Shop member role updated in database');

    // Update cache
    const cachedMembers = getCachedShopMembers();
    const index = cachedMembers.findIndex(m => m.id === memberId);
    if (index !== -1) {
      cachedMembers[index] = updatedMember;
      setCachedShopMembers(cachedMembers);
    }

    return { data: updatedMember, error: null };
  } catch (err: any) {
    console.error('❌ Update shop member role failed:', err);
    return { data: null, error: err.message || 'Rol güncellenemedi' };
  }
}

/**
 * Sync shops from database to cache
 * Call this on app initialization
 */
export async function syncShopsFromDatabase(userId: string) {
  console.log('🔄 Syncing shops from database...');

  try {
    const shops = await getUserShops(userId);
    console.log('✅ Synced', shops.length, 'shops from database');
    return shops;
  } catch (err) {
    console.error('❌ Failed to sync shops:', err);
    return [];
  }
}
