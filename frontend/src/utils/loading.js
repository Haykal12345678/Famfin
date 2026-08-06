let loadingCount = 0;
const subscribers = new Set();

function emit() {
  const isLoading = loadingCount > 0;
  subscribers.forEach((subscriber) => subscriber(isLoading));
}

export function startLoading() {
  loadingCount += 1;
  if (loadingCount === 1) emit();
}

export function stopLoading() {
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount === 0) emit();
}

export function subscribeLoading(subscriber) {
  subscribers.add(subscriber);
  subscriber(loadingCount > 0);
  return () => subscribers.delete(subscriber);
}
