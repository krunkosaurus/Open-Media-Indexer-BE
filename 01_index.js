// index.js
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import exifr from 'exifr';
import fg from 'fast-glob';
import readline from 'readline';

const MEDIA_DIR = '/Users/krunkosaurus/Dropbox/Camera Uploads';
const STATE_FILE = './index_state.json';
const OUTPUT_FILE = './intermediate_data.json';

const BATCH_SIZE = 50; // Number of files to process before writing progress

// Determine file type (image/video)
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.heic', '.heif', '.png']);
const VIDEO_EXTENSIONS = new Set(['.mov', '.mp4']);

async function loadState() {
  try {
    const content = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return { processedCount: 0, totalFiles: 0, fileList: [] };
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

function getExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

function ffprobeMetadata(filePath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
    exec(cmd, (error, stdout) => {
      if (error) return reject(error);
      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  });
}

function parseVideoLocation(data) {
  const tags = data?.format?.tags || {};
  const isoLocation = tags['com.apple.quicktime.location.ISO6709'];
  if (!isoLocation) return { latitude: null, longitude: null };

  const match = isoLocation.match(/^([+\-]\d+\.\d+)([+\-]\d+\.\d+)/);
  if (!match) return { latitude: null, longitude: null };

  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);

  if (isNaN(lat) || isNaN(lon)) return { latitude: null, longitude: null };
  return { latitude: lat, longitude: lon };
}

async function processImage(filePath) {
  const data = await exifr.parse(filePath, { gps: true });
  if (!data) return null;

  const latitude = data.latitude || null;
  const longitude = data.longitude || null;
  if (!latitude || !longitude) return null;

  return {
    datetime_utc: data.DateTimeOriginal ? data.DateTimeOriginal.toISOString() : '',
    latitude,
    longitude,
    camera_make: data.Make || '',
    camera_model: data.Model || ''
  };
}

async function processVideo(filePath) {
  const data = await ffprobeMetadata(filePath);
  const { latitude, longitude } = parseVideoLocation(data);
  if (!latitude || !longitude) return null;

  let datetime_utc = '';
  if (data.format && data.format.tags && data.format.tags.creation_time) {
    const d = new Date(data.format.tags.creation_time);
    if (!isNaN(d.getTime())) {
      datetime_utc = d.toISOString();
    }
  }

  const camera_make = '';
  const camera_model = '';

  return {
    datetime_utc,
    latitude,
    longitude,
    camera_make,
    camera_model
  };
}

async function promptUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  let state = await loadState();
  let outputData = await loadOutputData();

  // Check if previously completed
  if (state.totalFiles > 0 && state.processedCount >= state.totalFiles) {
    // Already processed all files
    const answer = await promptUser('Indexing appears complete. Overwrite and start over? (y/n): ');
    const userChoice = await answer;
    if (userChoice === 'y' || userChoice === 'yes') {
      // Reset state and output
      state = { processedCount: 0, totalFiles: 0, fileList: [] };
      outputData = [];
      await saveState(state);
      await saveOutputData(outputData);
      console.log('State and output reset. Starting fresh.');
    } else {
      console.log('Exiting without changes.');
      process.exit(0);
    }
  }

  // If totalFiles is zero (fresh start), scan now
  if (state.totalFiles === 0) {
    const allFiles = await fg([`${MEDIA_DIR}/**/*.{jpg,jpeg,heic,heif,png,mov,mp4}`], { dot: false });
    state.totalFiles = allFiles.length;
    state.fileList = allFiles;
    state.processedCount = 0;
    await saveState(state);
  }

  const files = state.fileList.slice(state.processedCount);

  console.log(`Total files: ${state.totalFiles}. Resuming at: ${state.processedCount}`);

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const ext = getExtension(filePath);
    let result = null;

    try {
      if (IMAGE_EXTENSIONS.has(ext)) {
        result = await processImage(filePath);
      } else if (VIDEO_EXTENSIONS.has(ext)) {
        result = await processVideo(filePath);
      } else {
        // Not a known image/video extension, skip
      }

      if (result && result.latitude && result.longitude) {
        const filename = path.relative(MEDIA_DIR, filePath);
        outputData.push({
          filename,
          datetime_utc: result.datetime_utc,
          latitude: result.latitude,
          longitude: result.longitude,
          camera_make: result.camera_make,
          camera_model: result.camera_model,
          city: '',
          state: '',
          country: ''
        });
      }
    } catch (err) {
      console.error(`Error processing ${filePath}:`, err);
    }

    state.processedCount++;

    // Show progress & save state periodically
    if (state.processedCount % BATCH_SIZE === 0 || state.processedCount === state.totalFiles) {
      console.log(`Processed ${state.processedCount} / ${state.totalFiles}`);
      await saveOutputData(outputData);
      await saveState(state);
    }
  }

  console.log('Indexing complete!');
}

main().catch(console.error);
