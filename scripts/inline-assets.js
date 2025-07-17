const fs = require('fs');
const path = require('path');

const inputHtmlPath = 'index.html';
const outputHtmlPath = 'dist/index.html';

// Get repo from environment or fallback
const repoSlug = process.env.GITHUB_REPOSITORY || 'owner/repo';
const [owner, repoName] = repoSlug.split('/');
const baseUrl = `https://${owner}.github.io/${repoName}/`;

let html = fs.readFileSync(inputHtmlPath, 'utf8');

// 1. Inline CSS files
let inlinedCSS = '';
// Extract and remove <link> tags for relative .css files
html = html.replace(/<link\s+[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (match, href) => {
  if (/^https?:\/\//i.test(href)) return match; // Skip absolute links
  const cssPath = path.join(path.dirname(inputHtmlPath), href);
  if (!fs.existsSync(cssPath)) return '';
  const css = fs.readFileSync(cssPath, 'utf8');
  inlinedCSS += `\n/* Inlined from ${href} */\n${css}`;
  return ''; // Remove the original link tag
});

// Now inject the collected CSS just after <body>
html = html.replace(/<body[^>]*>/i, match => `${match}\n<style>\n${inlinedCSS}\n</style>`);


// 2. Inline JS files
html = html.replace(/<script\s+[^>]*src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi, (match, src) => {
  const jsPath = path.join(path.dirname(inputHtmlPath), src);
  if (!fs.existsSync(jsPath)) return match;
  const js = fs.readFileSync(jsPath, 'utf8');
  return `<script>\n${js}\n</script>`;
});

// 3. Rewrite relative href/src to absolute
html = html.replace(/(?:src|href)=["']([^"']+)["']/gi, (match, url) => {
  if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('#')) return match;
  const absolute = baseUrl + url.replace(/^\.?\//, '');
  return match.replace(url, absolute);
});

// 4. Rewrite fetch("...") with relative paths
html = html.replace(/fetch\(["']([^"']+)["']\)/gi, (match, url) => {
  if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('#')) return match;
  const absolute = baseUrl + url.replace(/^\.?\//, '');
  return `fetch("${absolute}")`;
});

fs.mkdirSync(path.dirname(outputHtmlPath), { recursive: true });
fs.writeFileSync(outputHtmlPath, html);

console.log(`✅ Wrote ${outputHtmlPath} with all local assets inlined and relative URLs rewritten.`);
