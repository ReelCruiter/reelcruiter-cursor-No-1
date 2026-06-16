import { countries, citiesByCountry } from "@/lib/locations";

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

export function findCountryForCity(cityName: string): string | null {
  const norm = normalizeToken(cityName);
  for (const [country, cities] of Object.entries(citiesByCountry)) {
    if (cities.some((city) => normalizeToken(city) === norm)) return country;
  }
  return null;
}

export function resolveCityCountry(
  part1: string,
  part2: string
): { city?: string; country?: string } {
  const cityPart = part1.trim();
  const regionPart = part2.trim();
  if (!cityPart || !regionPart) return {};

  if (countries.includes(regionPart)) {
    return { city: cityPart, country: regionPart };
  }

  const countryFromCity = findCountryForCity(cityPart);
  const countryFromRegion = findCountryForCity(regionPart);

  if (countryFromCity && countryFromRegion && countryFromCity === countryFromRegion) {
    return { city: cityPart, country: countryFromCity };
  }
  if (countryFromCity) return { city: cityPart, country: countryFromCity };
  if (countryFromRegion) return { city: cityPart, country: countryFromRegion };

  const countryByName = countries.find((c) => normalizeToken(c) === normalizeToken(regionPart));
  if (countryByName) return { city: cityPart, country: countryByName };

  // Avoid storing a second city name as the country (e.g. "Zaandam, Amsterdam").
  if (findCountryForCity(regionPart)) {
    return { city: cityPart, country: findCountryForCity(regionPart)! };
  }

  return {};
}
