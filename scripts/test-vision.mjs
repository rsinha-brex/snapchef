/**
 * Test script for vision detection API.
 * Downloads images at a constrained size (via URL params) and sends to the local API.
 * Usage: node scripts/test-vision.mjs <image_url>
 *        node scripts/test-vision.mjs --all  (runs preset test suite)
 */

const API_URL = 'http://127.0.0.1:8081/api/vision/detect';
const MAX_BASE64_SIZE = 4 * 1024 * 1024; // 4MB safety margin

// Append size constraints to common image CDNs
function constrainUrl(url, maxWidth = 800) {
  if (url.includes('unsplash.com')) return `${url.split('?')[0]}?w=${maxWidth}&q=75`;
  if (url.includes('pexels.com') && url.includes('photos')) return `${url}?auto=compress&w=${maxWidth}`;
  // For Google-served images, try adding size param
  if (url.includes('googleusercontent.com')) return url.replace(/=s\d+/, `=s${maxWidth}`).replace(/=w\d+/, `=w${maxWidth}`);
  return url;
}

async function fetchImageAsBase64(url) {
  const constrainedUrl = constrainUrl(url);
  console.log(`  Fetching: ${constrainedUrl.substring(0, 100)}...`);

  const resp = await fetch(constrainedUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching image`);

  const buffer = await resp.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  console.log(`  Size: ${(base64.length / 1024).toFixed(0)}KB base64 (${(buffer.byteLength / 1024).toFixed(0)}KB raw)`);

  if (base64.length > MAX_BASE64_SIZE) {
    throw new Error(`Image too large: ${(base64.length / 1024 / 1024).toFixed(1)}MB base64 (max 4MB)`);
  }

  return base64;
}

async function detectIngredients(base64) {
  const start = Date.now();
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });
  const elapsed = Date.now() - start;
  const data = await resp.json();

  if (!resp.ok) {
    return { error: data.error, status: resp.status, elapsed };
  }
  return { items: data.items, elapsed };
}

async function runTest(name, url) {
  console.log(`\n--- ${name} ---`);
  try {
    const base64 = await fetchImageAsBase64(url);
    const result = await detectIngredients(base64);

    if (result.error) {
      console.log(`  ❌ Error (${result.status}): ${result.error} [${result.elapsed}ms]`);
    } else if (result.items.length === 0) {
      console.log(`  ⚠️  No items detected [${result.elapsed}ms]`);
    } else {
      console.log(`  ✅ ${result.items.length} items detected [${result.elapsed}ms]:`);
      result.items.forEach(i => {
        const conf = i.confidence === 'high' ? '🟢' : i.confidence === 'medium' ? '🟡' : '🔴';
        console.log(`     ${conf} ${i.name} (${i.category}) ${i.note ? `— ${i.note}` : ''}`);
      });
    }
    return result;
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
    return { error: e.message };
  }
}

// Preset test images (small versions from free image sources)
const TEST_SUITE = [
  ['E1: Simple produce', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=75'],
  ['E2: Baking staples', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=75'],
  ['E3: Chicken + herbs', 'https://images.unsplash.com/photo-1604503468506-a8da13571cc3?w=600&q=75'],
  ['M1: Mixed veg cutting board', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=75'],
  ['M2: Leafy greens', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=75'],
  ['H1: Cluttered counter', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=75'],
  ['X1: Empty counter', 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=600&q=75'],
];

async function main() {
  const arg = process.argv[2];

  if (arg === '--all') {
    console.log('Running full test suite...');
    const results = [];
    for (const [name, url] of TEST_SUITE) {
      results.push(await runTest(name, url));
    }
    console.log('\n\n=== Summary ===');
    TEST_SUITE.forEach(([name], i) => {
      const r = results[i];
      if (r.error) console.log(`  ❌ ${name}: ${r.error}`);
      else console.log(`  ✅ ${name}: ${r.items?.length || 0} items [${r.elapsed}ms]`);
    });
  } else if (arg) {
    await runTest('Custom image', arg);
  } else {
    console.log('Usage:');
    console.log('  node scripts/test-vision.mjs <image_url>');
    console.log('  node scripts/test-vision.mjs --all');
  }
}

main();
