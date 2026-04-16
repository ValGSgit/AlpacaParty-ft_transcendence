import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// 🚨 In ES Modules, we have to recreate __dirname manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
// Make sure this path exactly matches where your icons live!
const ICONS_DIR = path.join(__dirname, 'public', 'icons');

// Create the icons folder if it doesn't exist yet
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

http.createServer((req, res) => {
  // CORS setup so your Vue app is allowed to talk to this server
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/save-icon') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());

    req.on('end', () => {
      try {
        const { name, image } = JSON.parse(body);

        // Strip the HTML data prefix to get the raw base64 image data
        const base64Data = image.replace(/^data:image\/png;base64,/, "");

        // Write the file directly to your hard drive!
        const filePath = path.join(ICONS_DIR, `${name}.png`);
        fs.writeFileSync(filePath, base64Data, 'base64');

        console.log(`📸 Successfully saved: ${name}.png`);
        res.end('Success');
      } catch (err) {
        console.error("Failed to save image:", err);
        res.statusCode = 500;
        res.end('Error');
      }
    });
  }
}).listen(PORT, () => console.log(`Photobooth Backend running on http://localhost:${PORT}`));