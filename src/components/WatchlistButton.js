// src/components/WatchlistButton.js
import React from "react";
import { TouchableOpacity, Text, Animated } from "react-native";
import { useWatchlist } from "../context/WatchlistContext";

export default function WatchlistButton({ ticker, name, price, score, bias }) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [inList, setInList] = useState(false);

  const handlePress = () => {
    if (inList) {
      removeFromWatchlist(ticker);
    } else {
      addToWatchlist({ ticker, name, price, score, bias });
    }
    setInList(!inList);
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text>{inList ? "⭐" : "☆"}</Text>
      <Text>{inList ? "Dans la watchlist" : "Ajouter"}</Text>
    </TouchableOpacity>
  );
}