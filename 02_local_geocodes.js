// local_geocode.js
import { promises as fs } from 'fs';
import path from 'path';
import allTheCities from 'all-the-cities';

const FILES_DIR = './files';
const INPUT_FILE = path.join(FILES_DIR, 'intermediate_data.json');
const STATE_FILE = path.join(FILES_DIR, 'geocode_state.json');
const OUTPUT_FILE = path.join(FILES_DIR, 'final_data.json');
const BATCH_SIZE = 50;

async function ensureFilesDir() {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

// Simple Haversine formula to compute distance between two lat/lon points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function loadState() {
  try {
    const content = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return { processedCount: 0, totalItems: 0 };
  }
}

async function saveState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function loadData() {
  const content = await fs.readFile(INPUT_FILE, 'utf8');
  return JSON.parse(content);
}

async function saveData(data) {
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2));
}

// Finds the nearest city to a given lat/lon
function findNearestCity(lat, lon) {
  let nearest = null;
  let minDist = Infinity;

  for (const city of allTheCities) {
    const cityLon = city.loc.coordinates[0];
    const cityLat = city.loc.coordinates[1];
    const dist = haversineDistance(lat, lon, cityLat, cityLon);
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }
  return nearest;
}

async function main() {
  await ensureFilesDir();

  let state = await loadState();
  let data = await loadData();

  let itemsToProcess = data.filter(item => item.latitude && item.longitude && !item.city && !item.country);

  if (state.totalItems === 0) {
    state.totalItems = itemsToProcess.length;
  } else {
    itemsToProcess = itemsToProcess.slice(state.processedCount);
  }

  console.log(`Total items needing local geocoding: ${state.totalItems}. Starting from ${state.processedCount}`);

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    const lat = parseFloat(item.latitude);
    const lon = parseFloat(item.longitude);

    if (!isNaN(lat) && !isNaN(lon)) {
      const city = findNearestCity(lat, lon);
      if (city) {
        item.city = city.name;
        item.country = city.country || '';
        item.state = '';
      }
    }

    state.processedCount++;

    if (state.processedCount % BATCH_SIZE === 0 || state.processedCount === state.totalItems) {
      console.log(`Local geocoded ${state.processedCount} / ${state.totalItems}`);
      await saveData(data);
      await saveState(state);
    }
  }

  console.log('Local geocoding complete!');
}

main().catch(console.error);
