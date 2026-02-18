export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          phone: string | null
          balance: number
          is_admin: boolean
          role: 'user' | 'moderator' | 'admin' | 'super_admin'
          is_seller: boolean
          store_name: string | null
          is_verified: boolean
          is_banned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          phone?: string | null
          balance?: number
          is_admin?: boolean
          role?: 'user' | 'moderator' | 'admin' | 'super_admin'
          is_seller?: boolean
          store_name?: string | null
          is_verified?: boolean
          is_banned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          phone?: string | null
          balance?: number
          is_admin?: boolean
          role?: 'user' | 'moderator' | 'admin' | 'super_admin'
          is_seller?: boolean
          store_name?: string | null
          is_verified?: boolean
          is_banned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          id: string
          user_id: string
          shop_id: string | null
          title: string
          description: string
          price: number
          category: 'vehicle' | 'real_estate' | 'item' | 'service'
          image_url: string | null
          status: 'active' | 'passive' | 'out_of_stock'
          mileage: number | null
          speed: number | null
          view_count: number
          boosted_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shop_id?: string | null
          title: string
          description: string
          price: number
          category: 'vehicle' | 'real_estate' | 'item' | 'service'
          image_url?: string | null
          status?: 'active' | 'passive' | 'out_of_stock'
          mileage?: number | null
          speed?: number | null
          view_count?: number
          boosted_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shop_id?: string | null
          title?: string
          description?: string
          price?: number
          category?: 'vehicle' | 'real_estate' | 'item' | 'service'
          image_url?: string | null
          status?: 'active' | 'passive' | 'out_of_stock'
          mileage?: number | null
          speed?: number | null
          view_count?: number
          boosted_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: 'boost' | 'test_balance' | 'purchase' | 'deposit' | 'withdrawal' | 'boost_expense' | 'listing_fee'
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'boost' | 'test_balance' | 'purchase' | 'deposit' | 'withdrawal' | 'boost_expense' | 'listing_fee'
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: 'boost' | 'test_balance' | 'purchase' | 'deposit' | 'withdrawal' | 'boost_expense' | 'listing_fee'
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          listing_id: string
          reporter_id: string
          reason: string
          status: 'pending' | 'reviewed' | 'resolved'
          admin_notes: string | null
          handled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          reporter_id: string
          reason: string
          status?: 'pending' | 'reviewed' | 'resolved'
          admin_notes?: string | null
          handled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          reporter_id?: string
          reason?: string
          status?: 'pending' | 'reviewed' | 'resolved'
          admin_notes?: string | null
          handled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_handled_by_fkey"
            columns: ["handled_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      shops: {
        Row: {
          id: string
          name: string
          description: string | null
          logo_url: string | null
          phone: string | null
          owner_id: string
          is_verified: boolean
          status: 'active' | 'passive' | 'banned'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          logo_url?: string | null
          phone?: string | null
          owner_id: string
          is_verified?: boolean
          status?: 'active' | 'passive' | 'banned'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          logo_url?: string | null
          phone?: string | null
          owner_id?: string
          is_verified?: boolean
          status?: 'active' | 'passive' | 'banned'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      shop_members: {
        Row: {
          id: string
          shop_id: string
          user_id: string
          role: 'owner' | 'editor'
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id: string
          role?: 'owner' | 'editor'
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          user_id?: string
          role?: 'owner' | 'editor'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      transfer_funds: {
        Args: {
          p_buyer_id: string
          p_seller_id: string
          p_listing_id: string
          p_amount: number
        }
        Returns: Json
      }
      increment_view_count: {
        Args: {
          p_listing_id: string
        }
        Returns: void
      }
      purchase_boost: {
        Args: {
          p_listing_id: string
          p_user_id: string
          p_cost: number
          p_duration_hours: number
        }
        Returns: Json
      }
      add_test_balance: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
      charge_listing_fee: {
        Args: {
          p_user_id: string
          p_fee?: number
        }
        Returns: Json
      }
      update_user_role: {
        Args: {
          p_user_id: string
          p_new_role: string
          p_admin_id: string
        }
        Returns: Json
      }
      update_shop_status: {
        Args: {
          p_shop_id: string
          p_new_status: string
          p_admin_id: string
        }
        Returns: Json
      }
      delete_shop_permanently: {
        Args: {
          p_shop_id: string
          p_admin_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
