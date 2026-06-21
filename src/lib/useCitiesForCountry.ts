import { useEffect, useState } from "react";
import { getCitiesForCountry } from "@/lib/locations";

/** City options for a country, loaded on demand. */
export function useCitiesForCountry(country: string): string[] {
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    if (!country) {
      setCities([]);
      return;
    }
    let cancelled = false;
    void getCitiesForCountry(country).then((list) => {
      if (!cancelled) setCities(list);
    });
    return () => {
      cancelled = true;
    };
  }, [country]);

  return cities;
}
