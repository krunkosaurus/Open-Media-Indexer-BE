// convert_to_msgpack.js
import { promises as fs } from 'fs';
import path from 'path';
import * as msgpack from '@msgpack/msgpack';

const FILES_DIR = './files';
const INPUT_FILE = path.join(FILES_DIR, '04_reduced.json');
const OUTPUT_FILE = path.join(FILES_DIR, '05_final_data.msgpack');

async function ensureFilesDir() {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

(async () => {
  await ensureFilesDir();
  const content = await fs.readFile(INPUT_FILE, 'utf8');
  const jsonData = JSON.parse(content);
  const binary = msgpack.encode(jsonData);
  await fs.writeFile(OUTPUT_FILE, binary);
  console.log('Conversion complete!');
})();
