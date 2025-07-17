const fs = require('fs');
const path = require('path');

// Determine base URL from GitHub repository env var
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error("❌ GITHUB_REPOSITORY not set. Are you running inside GitHub Actions?");
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
const baseURL = `https://${owner}.github.io/${repoName}/`;

const inputHtmlPath = 'index.html';
const outputHtmlPath = path.join('dist', 'index.html');

// Read the input HTML
let html = fs.readFileSync(inputHtmlPath, 'utf8');

// Replace relative src/href with absolute URLs
html = html.replace(/(<[^>]+\s)(src|href)=["'](assets\/|scripts\/|styles\/)([^"']+)["']/g,
  (match, before, attr, folder, file) => {
    return `${before}${attr}="${baseURL}${folder}${file}"`;
  }
);

// Ensure output directory exists
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(outputHtmlPath, html, 'utf8');

console.log(`✅ Rewritten HTML saved to ${outputHtmlPath}`);
console.log(`🔗 Using baseURL: ${baseURL}`);
