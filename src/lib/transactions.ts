import { supabase } from './supabase';

export interface PurchaseResult {
  success: boolean;
  error?: string;
  transaction_id?: string;
}

export async function purchaseListing(
  buyerId: string,
  sellerId: string,
  listingId: string,
  amount: number
): Promise<PurchaseResult> {
  try {
    const { data, error } = await supabase.rpc('transfer_funds', {
      p_buyer_id: buyerId,
      p_seller_id: sellerId,
      p_listing_id: listingId,
      p_amount: amount,
    } as any);

    if (error) throw error;

    return (data || { success: false, error: 'Unknown error' }) as unknown as PurchaseResult;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Transaction failed',
    };
  }
}

export async function createDepositRequest(userId: string, amount: number) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      buyer_id: userId,
      amount,
      status: 'pending',
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveDeposit(transactionId: string, userId: string, amount: number) {
  // Start a transaction-like operation
  const { error: txError } = await supabase
    .from('transactions')
    .update({ status: 'completed' } as any)
    .eq('id', transactionId);

  if (txError) throw txError;

  // Update user balance - using direct update since increment_balance might not exist
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();

  if (profile) {
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ balance: profile.balance + amount } as any)
      .eq('id', userId);

    if (balanceError) {
      // If balance update fails, revert transaction status
      await supabase
        .from('transactions')
        .update({ status: 'pending' } as any)
        .eq('id', transactionId);
      throw balanceError;
    }
  }
}

export async function fetchUserTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchPendingDeposits() {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      buyer_profile:buyer_id (
        username,
        balance
      )
    `)
    .eq('status', 'pending')
    .is('seller_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
