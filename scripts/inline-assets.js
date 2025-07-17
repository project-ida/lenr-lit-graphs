const fs = require('fs');
const path = require('path');

// Paths for source files
const htmlPath = 'index.html';
const cssPathPattern = /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/i;
const scriptSrcPattern = /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/ig;
const imgSrcPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/ig;
const cssUrlPattern = /url\\(["']?([^"')]+)["']?\\)/ig;  // to inline assets in CSS if needed

// Read the main HTML file
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Inline CSS: find the stylesheet link and replace with inline <style>
const cssMatch = htmlContent.match(cssPathPattern);
if (cssMatch) {
  const cssFile = cssMatch[1];
  const cssContent = fs.readFileSync(cssFile, 'utf8');
  // Replace any url(...) in CSS with embedded data URIs
  const inlinedCss = cssContent.replace(cssUrlPattern, (match, assetPath) => {
    if (!assetPath || assetPath.match(/^([a-z]+:|\/\/)/i)) {
      return match; // skip external or empty URLs
    }
    // Resolve the asset path relative to the CSS file
    const assetFullPath = path.join(path.dirname(cssFile), assetPath);
    const assetData = fs.readFileSync(assetFullPath);
    // Determine MIME type from extension
    const ext = path.extname(assetPath).toLowerCase();
    let mime;
    if (ext === '.png') mime = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.gif') mime = 'image/gif';
    else if (ext === '.svg') mime = 'image/svg+xml';
    else if (ext === '.woff') mime = 'font/woff';
    else if (ext === '.woff2') mime = 'font/woff2';
    else mime = 'application/octet-stream';
    const base64 = assetData.toString('base64');
    return `url("data:${mime};base64,${base64}")`;
  });
  // Embed the CSS in a <style> tag
  htmlContent = htmlContent.replace(cssPathPattern, `<style>\n${inlinedCss}\n</style>`);
}

// Inline JS: find all script tags with src and inline them
htmlContent = htmlContent.replace(scriptSrcPattern, (match, scriptFile) => {
  if (!scriptFile || scriptFile.match(/^([a-z]+:|\/\/)/i)) {
    return match; // skip external (CDN) scripts if any
  }
  let scriptContent = fs.readFileSync(scriptFile, 'utf8');
  // If this is main.js, remove fetch calls to external JSON and embed the data
  if (scriptFile.endsWith('main.js')) {
    // Embed JSON data directly to avoid runtime fetch
    const dataPath = path.join('data', 'overview.json');
    if (fs.existsSync(dataPath)) {
      const jsonText = fs.readFileSync(dataPath, 'utf8');
      // Remove async function wrapper and insert JSON content
      scriptContent = scriptContent.replace(/DOMContentLoaded",\s*async\s*\(\)/, 'DOMContentLoaded", ()');
      scriptContent = scriptContent.replace(/const data = await\s*\([^)]*fetch\([^)]*overview\.json[^)]*\)\)\.json\(\);?/, 
                                           `const data = ${jsonText};`);
    }
  }
  return `<script>\n${scriptContent}\n</script>`;
});

// Inline images: replace <img src="..."> with base64 data URL
htmlContent = htmlContent.replace(imgSrcPattern, (match, imgFile) => {
  if (!imgFile || imgFile.match(/^([a-z]+:|\/\/)/i)) {
    return match; // skip external images
  }
  const imgData = fs.readFileSync(imgFile);
  const ext = path.extname(imgFile).toLowerCase();
  let mime;
  if (ext === '.png') mime = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
  else if (ext === '.gif') mime = 'image/gif';
  else if (ext === '.svg') mime = 'image/svg+xml';
  else mime = 'application/octet-stream';
  const base64 = imgData.toString('base64');
  const dataUri = `data:${mime};base64,${base64}`;
  // Replace just the src attribute within the original <img> tag
  return match.replace(imgFile, dataUri);
});


// Ensure output directory exists
fs.mkdirSync('dist', { recursive: true });
// Write the standalone HTML file
fs.writeFileSync(path.join('dist', 'index.html'), htmlContent);
console.log("✅ Standalone HTML generated at dist/index.html");
