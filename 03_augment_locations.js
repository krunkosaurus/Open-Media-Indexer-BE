// augment_locations.js
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const FILES_DIR = './files';
const INPUT_FILE = path.join(FILES_DIR, 'final_data.json');
const OUTPUT_FILE = path.join(FILES_DIR, 'final_data.json');
const CACHE_FILE = path.join(FILES_DIR, 'geo_cache.json');

const BATCH_SIZE = 50; 
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search?format=jsonv2';

async function ensureFilesDir() {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

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
  const addr = place.address || {};

  return {
    city: addr.city || addr.town || addr.village || city,
    state: addr.state || '',
    country: addr.country || country || ''
  };
}

async function main() {
  await ensureFilesDir();

  let data = await loadData();
  let cache = await loadCache();

  let itemsToProcess = data.filter(item => item.city && !item.state);

  if (itemsToProcess.length === 0) {
    console.log('No items need state augmentation.');
    await saveData(data);
    return;
  }

  console.log(`Need to augment ${itemsToProcess.length} records with state info.`);

  let processedCount = 0;
  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    const cityKey = (item.city + '|' + (item.country || '')).toLowerCase();

    let cachedResult = cache[cityKey];
    if (!cachedResult) {
      const geo = await geocodeCity(item.city, item.country);
      if (geo) {
        cachedResult = { state: geo.state, country: geo.country };
        cache[cityKey] = cachedResult;
      } else {
        cachedResult = { state: '', country: item.country };
        cache[cityKey] = cachedResult;
      }
    }

    item.state = cachedResult.state;
    if (cachedResult.country) item.country = cachedResult.country;

    processedCount++;
    if (processedCount % BATCH_SIZE === 0 || processedCount === itemsToProcess.length) {
      console.log(`Processed ${processedCount} / ${itemsToProcess.length} city lookups`);
      await saveData(data);
      await saveCache(cache);
    }
  }

  console.log('State augmentation complete!');
}

main().catch(console.error);
