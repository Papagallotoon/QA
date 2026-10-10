// src/context/LearningModeContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "qa_learning_mode_enabled_v1";

const Ctx = createContext({
  enabled: false,
  toggle: () => {},
  setEnabled: () => {},
});

export function LearningModeProvider({ children }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!mounted) return;
        setEnabled(v === "1");
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KEY, enabled ? "1" : "0").catch(() => {});
  }, [enabled]);

  const value = useMemo(
    () => ({
      enabled,
      setEnabled,
      toggle: () => setEnabled((p) => !p),
    }),
    [enabled]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLearningMode() {
  return useContext(Ctx);
}
