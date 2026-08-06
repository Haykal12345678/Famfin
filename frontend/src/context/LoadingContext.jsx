import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { subscribeLoading } from "../utils/loading";

const LoadingContext = createContext({
  loading: false,
});

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeLoading(setLoading);
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      loading,
    }),
    [loading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}