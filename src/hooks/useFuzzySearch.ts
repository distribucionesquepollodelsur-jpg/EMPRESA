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
    });
  }, [data, options.keys, options.threshold, options.includeMatches]);

  const results = useMemo(() => {
    if (!searchTerm.trim()) {
      return data;
    }
    return fuse.search(searchTerm).map(result => result.item);
  }, [fuse, searchTerm, data]);

  return results;
}
