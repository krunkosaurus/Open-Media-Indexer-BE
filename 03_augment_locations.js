// augment_locations.js
import { promises as fs } from 'fs';
import fetch from 'node-fetch';

const INPUT_FILE = './final_data.json';
const OUTPUT_FILE = './final_data.json';
const CACHE_FILE = './geo_cache.json';

const BATCH_SIZE = 50; // adjust as needed
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search?format=jsonv2';

async function loadData() {
  const content = await fs.readFile(INPUT_FILE, 'utf8');
  return JSON.parse(content);
}

async function saveData(data) {
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2));
}

async function loadCache() {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

async function saveCache(cache) {
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// Query Nominatim by city+country
async function geocodeCity(city, country) {
  const query = [city, country].filter(Boolean).join(', ');
  const url = `${NOMINATIM_URL}&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (json.length === 0) return null;

  const place = json[0];
  // Nominatim returns address details if addressdetails=1 is set.
  const addr = place.address || {};

  return {
    city: addr.city || addr.town || addr.village || city, // fallback to the known city
    state: addr.state || '',
    country: addr.country || country || ''
  };
}

async function main() {
  let data = await loadData();
  let cache = await loadCache();

  // Filter items that need state info. Assume we have city and country from previous step.
  let itemsToProcess = data.filter(item => item.city && !item.state);

  // If no items need processing, we’re done.
  if (itemsToProcess.length === 0) {
    console.log('No items need state augmentation.');
    await saveData(data);
    return;
  }

  console.log(`Need to augment ${itemsToProcess.length} records with state info.`);

  let processedCount = 0;
  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    const cityKey = (item.city + '|' + (item.country || '')).toLowerCase(); // cache key

    // Check cache first
    let cachedResult = cache[cityKey];
    if (!cachedResult) {
      // Not in cache, call external service
      const geo = await geocodeCity(item.city, item.country);
      if (geo) {
        cachedResult = { state: geo.state, country: geo.country };
        // Update cache
        cache[cityKey] = cachedResult;
      } else {
        // Could not geocode city, leave state empty
        cachedResult = { state: '', country: item.country };
        cache[cityKey] = cachedResult; // cache failed attempt too
      }
    }

    // Update item with state and possibly better country if found
    item.state = cachedResult.state;
    if (cachedResult.country) item.country = cachedResult.country;

    processedCount++;
    if (processedCount % BATCH_SIZE === 0 || processedCount === itemsToProcess.length) {
      console.log(`Processed ${processedCount} / ${itemsToProcess.length} city lookups`);
      // Save partial results and cache
      await saveData(data);
      await saveCache(cache);
    }
  }

  console.log('State augmentation complete!');
}

main().catch(console.error);
