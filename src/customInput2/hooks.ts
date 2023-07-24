import { useCallback, useEffect, useRef } from 'react';

export function useDebounce<T extends (...params: any[]) => any>(
  fn: T,
  delay: number,
) {
  const timeoutRef = useRef<any>();
  const refFn = useRef<T>();

  useEffect(() => {
    refFn.current = fn;
  }, [fn]);

  return useCallback(
    (...params: Parameters<T>) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        refFn.current?.(...params);
      }, delay);
    },
    [delay],
  );
}
