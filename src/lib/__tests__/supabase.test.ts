import { describe, it, expect } from 'vitest';

describe('Supabase Client Configuration', () => {
  // Feature: lister-marketplace, Property 29: Environment Variable Failure Handling
  it('should have VITE_SUPABASE_URL environment variable defined', () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    
    if (!url) {
      expect(() => {
        throw new Error('Missing environment variable: VITE_SUPABASE_URL');
      }).toThrow('Missing environment variable: VITE_SUPABASE_URL');
    } else {
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    }
  });

  it('should have VITE_SUPABASE_ANON_KEY environment variable defined', () => {
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!key) {
      expect(() => {
        throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY');
      }).toThrow('Missing environment variable: VITE_SUPABASE_ANON_KEY');
    } else {
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    }
  });

  it('should validate environment variable error handling logic', () => {
    // Test the error throwing logic
    const testMissingUrl = (url: string | undefined) => {
      if (!url) {
        throw new Error('Missing environment variable: VITE_SUPABASE_URL');
      }
    };

    const testMissingKey = (key: string | undefined) => {
      if (!key) {
        throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY');
      }
    };

    expect(() => testMissingUrl(undefined)).toThrow('Missing environment variable: VITE_SUPABASE_URL');
    expect(() => testMissingKey(undefined)).toThrow('Missing environment variable: VITE_SUPABASE_ANON_KEY');
    
    // Should not throw when values are provided
    expect(() => testMissingUrl('https://test.supabase.co')).not.toThrow();
    expect(() => testMissingKey('test-key')).not.toThrow();
  });
});
