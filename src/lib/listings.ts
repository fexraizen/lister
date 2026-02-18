import { supabase } from './supabase';
import type { Database } from './database.types';

type ListingUpdate = Database['public']['Tables']['listings']['Update'];

export async function updateListing(listingId: string, updates: Partial<ListingUpdate>) {
  const { data, error } = await supabase
    .from('listings')
    .update(updates as any)
    .eq('id', listingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteListing(listingId: string) {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId);

  if (error) throw error;
}

export async function fetchListings(filters?: {
  category?: string;
  status?: string;
  userId?: string;
}) {
  let query = supabase
    .from('listings')
    .select(`
      *,
      profiles:user_id (
        username,
        store_name
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category as any);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status as any);
  }

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export type Listing = Database['public']['Tables']['listings']['Row'];

export function sortListings(listings: Listing[]): Listing[] {
  const now = new Date();
  
  return [...listings].sort((a, b) => {
    // First priority: boosted listings
    const aIsBoosted = a.boosted_until && new Date(a.boosted_until) > now;
    const bIsBoosted = b.boosted_until && new Date(b.boosted_until) > now;
    
    if (aIsBoosted && !bIsBoosted) return -1;
    if (!aIsBoosted && bIsBoosted) return 1;
    
    // Second priority: view count (descending)
    return b.view_count - a.view_count;
  });
}
