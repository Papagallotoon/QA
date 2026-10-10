// src/components/EducationalTooltip.js
// src/context/WatchlistContext.js
import React, { createContext, useContext, useState, useCallback } from "react";

const WatchlistContext = createContext(null);

export function WatchlistProvider({ children }) {
  const [watchlist, setWatchlist] = useState([]);

  const isWatched = useCallback(
    (symbol) => watchlist.includes(symbol),
    [watchlist]
  );

  const addToWatchlist = useCallback((symbol) => {
    setWatchlist((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
  }, []);

  const removeFromWatchlist = useCallback((symbol) => {
    setWatchlist((prev) => prev.filter((s) => s !== symbol));
  }, []);

  const toggleWatchlist = useCallback((symbol) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  }, []);

  return (
    <WatchlistContext.Provider
      value={{ watchlist, isWatched, addToWatchlist, removeFromWatchlist, toggleWatchlist }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist doit être utilisé dans un WatchlistProvider");
  return ctx;
}

export default WatchlistProvider;