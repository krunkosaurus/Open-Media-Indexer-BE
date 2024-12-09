// normalize_data.js
import { promises as fs } from 'fs';
import path from 'path';

const FILES_DIR = './files';
const INPUT_FILE = path.join(FILES_DIR, 'final_data.json');
const OUTPUT_FILE = path.join(FILES_DIR, '04_reduced.json');

async function ensureFilesDir() {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

(async () => {
  await ensureFilesDir();
  const content = await fs.readFile(INPUT_FILE, 'utf8');
  const data = JSON.parse(content);

  const locationMap = new Map(); // key: "city|state|country"
  const locations = [];
  let nextId = 0;

  for (const item of data) {
    const city = item.city || '';
    const state = item.state || '';
    const country = item.country || '';
    const key = `${city}|${state}|${country}`;

    if (!locationMap.has(key)) {
      locationMap.set(key, nextId);
      locations.push({ city, state, country });
      nextId++;
    }

    item.location_id = locationMap.get(key);

    delete item.city;
    delete item.state;
    delete item.country;
  }

  const normalizedData = { locations, items: data };
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(normalizedData));
})();
