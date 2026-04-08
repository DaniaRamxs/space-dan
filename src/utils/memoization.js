import { memo, useMemo, useCallback } from 'react';

// Memoización para componentes pesados
export const memoHeavy = (Component, areEqual = null) => {
  return memo(Component, areEqual);
};

// Memoización para cálculos complejos
export const useMemoCalc = (calcFunc, deps) => {
  return useMemo(calcFunc, deps);
};

// Memoización para callbacks
export const useMemoCallback = (callback, deps) => {
  return useCallback(callback, deps);
};

// Memoización para arrays/objects
export const useMemoData = (data) => {
  return useMemo(() => data, [JSON.stringify(data)]);
};

// Memoización para filtros complejos
export const useMemoFilter = (items, filterFn) => {
  return useMemo(() => items.filter(filterFn), [items, filterFn]);
};

// Memoización para sorting
export const useMemoSort = (items, sortFn) => {
  return useMemo(() => [...items].sort(sortFn), [items, sortFn]);
};

// Memoización para paginación
export const useMemoPagination = (items, page, pageSize) => {
  return useMemo(() => {
    const start = page * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);
};
