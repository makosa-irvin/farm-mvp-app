import { describe, expect, it } from 'vitest';
import { childrenOf, memberIdsFor } from '../../src/lib/farmGrouping.js';

describe('farm grouping', () => {
  const units = [
    { id: 'dairy', name: 'Dairy cows' },
    { id: 'bella', name: 'Bella', parentGroupId: 'dairy' },
    { id: 'lulu', name: 'Lulu', parentGroupId: 'dairy' },
    { id: 'layers', name: 'Layers' },
  ];

  it('expands a parent group to its individually logged members', () => {
    expect(memberIdsFor(units, 'dairy')).toEqual(['dairy', 'bella', 'lulu']);
  });

  it('keeps standalone groups independently addressable', () => {
    expect(memberIdsFor(units, 'layers')).toEqual(['layers']);
  });

  it('returns children for display and management', () => {
    expect(childrenOf(units, 'dairy').map((u) => u.name)).toEqual(['Bella', 'Lulu']);
  });
});
