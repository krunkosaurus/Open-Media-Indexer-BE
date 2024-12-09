import { promises as fs } from 'fs';

const INPUT_FILE = './final_data.json';
const OUTPUT_FILE = './04_reduced.json';

(async () => {
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

    // Replace direct fields with location_id
    item.location_id = locationMap.get(key);

    // Optional: Remove original city/state/country to save even more space
    delete item.city;
    delete item.state;
    delete item.country;
    //delete item.filename;
  }

  const normalizedData = { locations, items: data };
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(normalizedData));
})();
