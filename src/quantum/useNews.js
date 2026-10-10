import { useState, useEffect, useCallback, useRef } from "react";
import { fetchNews, fetchNewsMany } from "./api/news";

var CACHE_MS = 10 * 60 * 1000;
var cache = {};

export function useNews(queries, count) {
  var key = Array.isArray(queries) ? queries.join(",") : String(queries);
  var [items, setItems] = useState(cache[key] ? cache[key].items : []);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var alive = useRef(true);

  useEffect(function () {
    alive.current = true;
    return function () { alive.current = false; };
  }, []);

  var load = useCallback(async function (force) {
    if (!queries || (Array.isArray(queries) && !queries.length)) return;
    var hit = cache[key];
    if (!force && hit && Date.now() - hit.at < CACHE_MS) {
      setItems(hit.items);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      var res = Array.isArray(queries)
        ? await fetchNewsMany(queries, 5)
        : await fetchNews(queries, count || 10);
      cache[key] = { at: Date.now(), items: res };
      if (alive.current) setItems(res);
    } catch (e) {
      if (alive.current) setError(e.message || String(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [key]);

  useEffect(function () { load(false); }, [key]);

  return { items: items, loading: loading, error: error, refresh: function () { load(true); } };
}
