import { countries, getCitiesCache, preloadCitiesData } from "@/lib/locations";

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function findCountryForCitySync(cityName: string): string | null {
  const citiesByCountry = getCitiesCache();
  if (!citiesByCountry) return null;
  const norm = normalizeToken(cityName);
  for (const [country, cities] of Object.entries(citiesByCountry)) {
    if (cities.some((city) => normalizeToken(city) === norm)) return country;
  }
  return null;
}

export function resolveCityCountrySync(
  part1: string,
  part2: string,
): { city?: string; country?: string } {
  const cityPart = part1.trim();
  const regionPart = part2.trim();
  if (!cityPart || !regionPart) return {};

  if (countries.includes(regionPart)) {
    return { city: cityPart, country: regionPart };
  }

  const countryFromCity = findCountryForCitySync(cityPart);
  const countryFromRegion = findCountryForCitySync(regionPart);

  if (countryFromCity && countryFromRegion && countryFromCity === countryFromRegion) {
    return { city: cityPart, country: countryFromCity };
  }
  if (countryFromCity) return { city: cityPart, country: countryFromCity };
  if (countryFromRegion) return { city: cityPart, country: countryFromRegion };

  const countryByName = countries.find((c) => normalizeToken(c) === normalizeToken(regionPart));
  if (countryByName) return { city: cityPart, country: countryByName };

  if (findCountryForCitySync(regionPart)) {
    return { city: cityPart, country: findCountryForCitySync(regionPart)! };
  }

  return {};
}

export async function resolveCityCountry(
  part1: string,
  part2: string,
): Promise<{ city?: string; country?: string }> {
  await preloadCitiesData();
  return resolveCityCountrySync(part1, part2);
}

export async function findCountryForCity(cityName: string): Promise<string | null> {
  await preloadCitiesData();
  return findCountryForCitySync(cityName);
}
