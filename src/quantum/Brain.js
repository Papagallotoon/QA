// Recupere le modele appris chaque nuit par le serveur, son bilan de fiabilite
// et les signaux du jour. Garde la derniere version en memoire telephone pour
// fonctionner hors ligne ; a defaut, utilise le modele par defaut embarque.

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_MODEL } from "./core/model.js";
import { MODEL_URL, TRACK_URL, SIGNALS_URL } from "./config";

var Ctx = createContext({ model: DEFAULT_MODEL, track: null, signals: null, status: "defaut", refresh: function () {} });
var KEY = "qa.brain.v1";

async function getJson(url) {
  var res = await fetch(url + "?t=" + Math.floor(Date.now() / 600000), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

function valid(m) { return m && m.horizons && typeof m.horizons === "object"; }

export function BrainProvider(props) {
  var [state, setState] = useState({ model: DEFAULT_MODEL, track: null, signals: null, status: "defaut", error: null });

  var refresh = useCallback(async function () {
    try {
      var r = await Promise.all([
        getJson(MODEL_URL),
        getJson(TRACK_URL).catch(function () { return null; }),
        getJson(SIGNALS_URL).catch(function () { return null; }),
      ]);
      if (!valid(r[0])) throw new Error("modele invalide");
      var next = { model: r[0], track: r[1], signals: r[2], status: "en ligne", error: null };
      setState(next);
      AsyncStorage.setItem(KEY, JSON.stringify({ model: r[0], track: r[1], signals: r[2] })).catch(function () {});
    } catch (e) {
      setState(function (p) { return Object.assign({}, p, { error: e.message || String(e) }); });
    }
  }, []);

  useEffect(function () {
    AsyncStorage.getItem(KEY).then(function (raw) {
      if (!raw) return;
      try {
        var saved = JSON.parse(raw);
        if (valid(saved.model)) {
          setState(function (p) {
            return p.status === "en ligne" ? p : { model: saved.model, track: saved.track, signals: saved.signals, status: "hors ligne", error: null };
          });
        }
      } catch (e) {}
    }).catch(function () {}).finally(refresh);
  }, []);

  var value = Object.assign({}, state, { refresh: refresh });
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useBrain() { return useContext(Ctx); }
