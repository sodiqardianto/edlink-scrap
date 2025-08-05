import { promises as fs } from 'fs';
import path from 'path';

// Create directory if not exists
export async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Save data to JSON file
export async function saveToJson(data, filename) {
  const outputDir = './output';
  await ensureDir(outputDir);
  
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  
  console.log(`Data saved to: ${filePath}`);
}

// Add delay
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate timestamp
export function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}