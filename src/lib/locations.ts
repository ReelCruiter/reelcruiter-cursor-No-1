// Worldwide country + city data for ReelCruiter.
// Cities are loaded on demand so the main app bundle stays small on mobile.

export const countries: string[] = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
  "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada",
  "Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia",
  "Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador",
  "Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia",
  "Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti",
  "Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel",
  "Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Laos",
  "Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi",
  "Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia",
  "Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger",
  "Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palestine","Panama","Papua New Guinea","Paraguay",
  "Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal",
  "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Somalia","South Africa","South Korea","South Sudan",
  "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania",
  "Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

type CitiesMap = Record<string, string[]>;

let citiesCache: CitiesMap | null = null;
let citiesPromise: Promise<CitiesMap> | null = null;

export function getCitiesCache(): CitiesMap | null {
  return citiesCache;
}

/** Load the full city list once (separate chunk, not in the main bundle). */
export function preloadCitiesData(): Promise<CitiesMap> {
  if (citiesCache) return Promise.resolve(citiesCache);
  if (!citiesPromise) {
    citiesPromise = import("./data/citiesByCountry.json").then((mod) => {
      citiesCache = mod.default as CitiesMap;
      return citiesCache;
    });
  }
  return citiesPromise;
}

export async function getCitiesForCountry(country: string): Promise<string[]> {
  if (!country) return [];
  const data = await preloadCitiesData();
  return data[country] ?? [];
}

/** Sync helper after cities have been preloaded (e.g. resume parsing). */
export function getCitiesForCountrySync(country: string): string[] {
  if (!country || !citiesCache) return [];
  return citiesCache[country] ?? [];
}

export async function getCitiesByCountryMap(): Promise<CitiesMap> {
  return preloadCitiesData();
}
