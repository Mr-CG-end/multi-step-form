type Debounced<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  wait: number,
): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = ((...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      callback(...args);
    }, wait);
  }) as Debounced<Args>;

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
