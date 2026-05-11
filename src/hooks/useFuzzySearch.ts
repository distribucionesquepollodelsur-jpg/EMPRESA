import { useMemo } from 'react';
import Fuse from 'fuse.js';

interface UseFuzzySearchOptions<T> {
  keys: string[];
  threshold?: number;
  includeMatches?: boolean;
}

export function useFuzzySearch<T>(
  data: T[],
  searchTerm: string,
  options: UseFuzzySearchOptions<T>
) {
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: options.keys,
      threshold: options.threshold ?? 0.3, // 0.0 is perfect match, 1.0 is no match
      includeMatches: options.includeMatches ?? false,
      ignoreLocation: true,
      minMatchCharLength: 1,
      useExtendedSearch: true, // Allows for more complex queries
      findAllMatches: true,
    });
  }, [data, options.keys, options.threshold, options.includeMatches]);

  const results = useMemo(() => {
    if (!searchTerm.trim()) {
      return data;
    }
    
    // Support multi-word search by splitting and treating as an "AND" like search
    // We format the search term for Fuse's extended search: 'term1 'term2 
    // This tells Fuse to look for items that match both terms in any field
    const terms = searchTerm.trim().split(/\s+/).filter(t => t.length > 0);
    const searchString = terms.map(t => `'${t}`).join(' ');

    const fuseResults = fuse.search(searchString);
    
    // If and-like search returns too few results, fallback to standard search
    if (fuseResults.length === 0 && searchTerm.trim().length > 0) {
        return fuse.search(searchTerm).map(result => result.item);
    }

    return fuseResults.map(result => result.item);
  }, [fuse, searchTerm, data]);

  return results;
}
