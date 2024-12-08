import { promises as fs } from 'fs';
import path from 'path';
import exifr from 'exifr';
import fg from 'fast-glob';

const MEDIA_DIR = '/Users/krunkosaurus/Dropbox/Camera Uploads';
const STATE_FILE = './index_state.json';
const OUTPUT_FILE = './intermediate_data.json';

const BATCH_SIZE = 50; // Number of files to process before writing out progress

async function loadState() {
  try {
    const content = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return { processedCount: 0, totalFiles: 0 };
  }
}

async function saveState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function loadOutputData() {
  try {
    const content = await fs.readFile(OUTPUT_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

async function saveOutputData(data) {
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2));
}

async function main() {
  // Load previous state if exists
  let state = await loadState();
  let outputData = await loadOutputData();

  let files;
  if (state.totalFiles > 0) {
    // Resume scenario: we already have a file list length
    files = []; // We don't need the full list again if we trust totalFiles
    // But if we want to resume exact files, we should store them as well.
    // For simplicity, we refetch and skip processed ones here:
    const allFiles = await fg([`${MEDIA_DIR}/**/*.{jpg,jpeg,heic,heif,png,mov,mp4}`], { dot: false });
    files = allFiles.slice(state.processedCount);
  } else {
    // Fresh run
    const allFiles = await fg([`${MEDIA_DIR}/**/*.{jpg,jpeg,heic,heif,png,mov,mp4}`], { dot: false });
    state.totalFiles = allFiles.length;
    files = allFiles;
  }

  console.log(`Total files: ${state.totalFiles}. Starting from index: ${state.processedCount}`);

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    try {
      const data = await exifr.parse(filePath, { gps: true });
      const filename = path.relative(MEDIA_DIR, filePath);
      const datetime_utc = data && data.DateTimeOriginal ? data.DateTimeOriginal.toISOString() : '';
      const latitude = data && data.latitude ? data.latitude : '';
      const longitude = data && data.longitude ? data.longitude : '';
      const camera_make = data && data.Make || '';
      const camera_model = data && data.Model || '';

      outputData.push({
        filename,
        datetime_utc,
        latitude,
        longitude,
        camera_make,
        camera_model,
        // We leave city/state/country blank for now
        city: '',
        state: '',
        country: ''
      });
    } catch (err) {
      console.error(`Error processing ${files[i]}:`, err);
      // We can still push the record with minimal data or skip entirely
      // For now, skip.
    }

    state.processedCount++;

    // Show progress
    if (state.processedCount % BATCH_SIZE === 0 || state.processedCount === state.totalFiles) {
      console.log(`Processed ${state.processedCount} / ${state.totalFiles}`);
      // Save state and output data
      await saveOutputData(outputData);
      await saveState(state);
    }
  }

  console.log('Indexing complete!');
}

main().catch(console.error);
