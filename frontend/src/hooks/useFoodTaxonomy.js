import { useCallback, useEffect, useState } from "react";
import axios from "../api/axios";
import {
  FOOD_CATEGORIES,
  FOOD_TYPES,
  FOOD_SUBTYPES,
} from "../utils/standardizedOptions";

function mergeUnique(base = [], extras = []) {
  const seen = new Set();
  const out = [];
  for (const v of [...base, ...extras]) {
    if (!v || v === "Add +") continue;
    const key = String(v).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(String(v));
  }
  return out;
}

function withAddPlus(list) {
  return [...mergeUnique(list, []), "Add +"];
}

/**
 * Loads Mongo-backed taxonomy extras and merges with static dropdown lists.
 */
export default function useFoodTaxonomy() {
  const [categories, setCategories] = useState(FOOD_CATEGORIES);
  const [typesByCategory, setTypesByCategory] = useState(FOOD_TYPES);
  const [extraSubtypes, setExtraSubtypes] = useState({});
  const [loading, setLoading] = useState(true);

  const applyTaxonomy = useCallback((taxonomy) => {
    if (!taxonomy) return;
    if (Array.isArray(taxonomy.categories) && taxonomy.categories.length) {
      setCategories(taxonomy.categories);
    }
    if (taxonomy.types && typeof taxonomy.types === "object") {
      setTypesByCategory(taxonomy.types);
    }
    if (taxonomy.subtypes && typeof taxonomy.subtypes === "object") {
      setExtraSubtypes(taxonomy.subtypes);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await axios.get("/food-taxonomy");
      applyTaxonomy(data);
    } catch (err) {
      console.error("Failed to load food taxonomy", err);
      // Fall back to static lists
      setCategories(FOOD_CATEGORIES);
      setTypesByCategory(FOOD_TYPES);
      setExtraSubtypes({});
    } finally {
      setLoading(false);
    }
  }, [applyTaxonomy]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const typesFor = useCallback(
    (category) => {
      if (!category) return [];
      const fromApi = typesByCategory[category];
      if (Array.isArray(fromApi) && fromApi.length) return fromApi;
      return withAddPlus(FOOD_TYPES[category] || []);
    },
    [typesByCategory]
  );

  const subtypesFor = useCallback(
    (type) => {
      if (!type || type === "Add +") return ["Add +"];
      return withAddPlus(
        mergeUnique(FOOD_SUBTYPES[type] || [], extraSubtypes[type] || [])
      );
    },
    [extraSubtypes]
  );

  const addOption = useCallback(
    async ({ kind, value, parent }) => {
      const { data } = await axios.post("/food-taxonomy", {
        kind,
        value,
        parent,
      });
      if (data?.taxonomy) applyTaxonomy(data.taxonomy);
      else await refresh();
      return data?.option?.value || value;
    },
    [applyTaxonomy, refresh]
  );

  return {
    categories,
    typesFor,
    subtypesFor,
    addOption,
    refresh,
    loading,
  };
}
