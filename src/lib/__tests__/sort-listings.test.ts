import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sortListings, Listing } from '../listings';

describe('Listing Sort Logic - Property-Based Tests', () => {
  // Feature: marketplace-advanced-features, Property 4: Boosted listings prioritization
  describe('Property 4: Boosted listings prioritization', () => {
    it('should place all boosted listings before non-boosted listings', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              shop_id: fc.constantFrom(null, fc.sample(fc.uuid(), 1)[0]),
              title: fc.string({ minLength: 5, maxLength: 50 }),
              description: fc.string({ minLength: 10, maxLength: 200 }),
              price: fc.integer({ min: 1, max: 1000000 }),
              category: fc.constantFrom('vehicle', 'real_estate', 'item', 'service'),
              image_url: fc.constantFrom(null, 'https://example.com/image.jpg'),
              status: fc.constant('active'),
              mileage: fc.constantFrom(null, fc.integer({ min: 0, max: 500000 })),
              speed: fc.constantFrom(null, fc.integer({ min: 0, max: 300 })),
              view_count: fc.integer({ min: 0, max: 10000 }),
              boosted_until: fc.option(
                fc.constantFrom(
                  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                ),
                { nil: null }
              ),
              created_at: fc.constant(new Date().toISOString()),
              updated_at: fc.constant(new Date().toISOString()),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          (listings) => {
            const sorted = sortListings(listings as Listing[]);
            const now = new Date();
            
            // Find the index of the last boosted listing
            let lastBoostedIndex = -1;
            let firstNonBoostedIndex = sorted.length;
            
            sorted.forEach((listing, index) => {
              const isBoosted = listing.boosted_until && new Date(listing.boosted_until) > now;
              if (isBoosted) {
                lastBoostedIndex = index;
              } else if (firstNonBoostedIndex === sorted.length) {
                firstNonBoostedIndex = index;
              }
            });
            
            // Property: All boosted listings should come before all non-boosted listings
            if (lastBoostedIndex >= 0 && firstNonBoostedIndex < sorted.length) {
              expect(lastBoostedIndex).toBeLessThan(firstNonBoostedIndex);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: marketplace-advanced-features, Property 5: View count descending order
  describe('Property 5: View count descending order', () => {
    it('should sort non-boosted listings by view_count in descending order', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              shop_id: fc.constantFrom(null, fc.sample(fc.uuid(), 1)[0]),
              title: fc.string({ minLength: 5, maxLength: 50 }),
              description: fc.string({ minLength: 10, maxLength: 200 }),
              price: fc.integer({ min: 1, max: 1000000 }),
              category: fc.constantFrom('vehicle', 'real_estate', 'item', 'service'),
              image_url: fc.constantFrom(null, 'https://example.com/image.jpg'),
              status: fc.constant('active'),
              mileage: fc.constantFrom(null, fc.integer({ min: 0, max: 500000 })),
              speed: fc.constantFrom(null, fc.integer({ min: 0, max: 300 })),
              view_count: fc.integer({ min: 0, max: 10000 }),
              boosted_until: fc.constant(null), // Only non-boosted listings
              created_at: fc.constant(new Date().toISOString()),
              updated_at: fc.constant(new Date().toISOString()),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          (listings) => {
            const sorted = sortListings(listings as Listing[]);
            
            // Property: Each listing's view_count should be >= the next listing's view_count
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].view_count).toBeGreaterThanOrEqual(sorted[i + 1].view_count);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: marketplace-advanced-features, Property 6: Sort stability
  describe('Property 6: Sort stability', () => {
    it('should produce consistent ordering for listings with equal view_counts', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              shop_id: fc.constantFrom(null, fc.sample(fc.uuid(), 1)[0]),
              title: fc.string({ minLength: 5, maxLength: 50 }),
              description: fc.string({ minLength: 10, maxLength: 200 }),
              price: fc.integer({ min: 1, max: 1000000 }),
              category: fc.constantFrom('vehicle', 'real_estate', 'item', 'service'),
              image_url: fc.constantFrom(null, 'https://example.com/image.jpg'),
              status: fc.constant('active'),
              mileage: fc.constantFrom(null, fc.integer({ min: 0, max: 500000 })),
              speed: fc.constantFrom(null, fc.integer({ min: 0, max: 300 })),
              view_count: fc.constant(100), // Same view count for all
              boosted_until: fc.constant(null),
              created_at: fc.constant(new Date().toISOString()),
              updated_at: fc.constant(new Date().toISOString()),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (listings) => {
            const sorted1 = sortListings(listings as Listing[]);
            const sorted2 = sortListings(listings as Listing[]);
            
            // Property: Multiple sorts should produce the same order
            expect(sorted1.map(l => l.id)).toEqual(sorted2.map(l => l.id));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
