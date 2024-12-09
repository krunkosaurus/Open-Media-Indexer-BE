// convert_to_msgpack.js
import { promises as fs } from 'fs';
import * as msgpack from '@msgpack/msgpack';

const INPUT_FILE = './04_reduced.json';
const OUTPUT_FILE = './05_final_data.msgpack';

(async () => {
  const content = await fs.readFile(INPUT_FILE, 'utf8');
  const jsonData = JSON.parse(content);
  const binary = msgpack.encode(jsonData);
  await fs.writeFile(OUTPUT_FILE, binary);
  console.log('Conversion complete!');
})();
