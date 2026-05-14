/**
 * Suite 1: Vision API stress test via GTM browser.
 * Usage: node scripts/browser-tests/run-vision.mjs [--start=N] [--count=M] [--category=NAME]
 */
import { navigate, saveScreenshot, evaluate } from './gtm.mjs';
import { delay, waitForEither, injectImageFromUrl, timestamp } from './helpers.mjs';
import { getAllImages, getImagesByCategory } from './image-catalog.mjs';
import fs from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => { const [k, v] = a.replace('--', '').split('='); return [k, v]; })
);

const start = parseInt(args.start || '0');
const count = parseInt(args.count || '100');
const category = args.category || null;

const images = category ? getImagesByCategory(category) : getAllImages();
const subset = images.slice(start, start + count);

console.log(`\n🔬 Vision Stress Test — ${subset.length} images (${start} to ${start + subset.length - 1})`);
console.log(`   Categories: ${[...new Set(subset.map(i => i.category))].join(', ')}\n`);

const results = [];
let passed = 0, failed = 0, errors = 0;

for (let i = 0; i < subset.length; i++) {
  const img = subset[i];
  const testNum = String(i + 1).padStart(3, '0');
  const startTime = Date.now();

  process.stdout.write(`[${testNum}/${subset.length}] ${img.label} (${img.category})... `);

  try {
    await navigate('http://localhost:8081/counter/camera');
    await delay(2000);

    const injectResult = await injectImageFromUrl(img.url);
    if (typeof injectResult === 'string') {
      const parsed = JSON.parse(injectResult);
      if (!parsed.success) throw new Error(parsed.error);
    }

    const found = await waitForEither(
      ['We found', "couldn't identify", 'Something went wrong'],
      18000
    );

    const elapsed = Date.now() - startTime;
    let status, itemCount = 0;

    if (found && found.includes('We found')) {
      const countText = await evaluate(`
        var t = document.body.innerText;
        var m = t.match(/We found (\\d+) ingredient/);
        m ? m[1] : '0';
      `);
      itemCount = parseInt(countText) || 0;

      if (img.minItems === 0 && itemCount > 0) {
        status = 'false_positive';
        failed++;
      } else if (img.minItems > 0 && itemCount >= img.minItems) {
        status = 'pass';
        passed++;
      } else if (img.minItems > 0 && itemCount > 0) {
        status = 'partial';
        passed++;
      } else {
        status = 'fail';
        failed++;
      }
    } else if (found && (found.includes("couldn't") || found.includes('went wrong'))) {
      if (img.minItems === 0) {
        status = 'pass';
        passed++;
      } else {
        status = 'no_detection';
        failed++;
      }
    } else {
      status = 'timeout';
      errors++;
    }

    const screenshotPath = await saveScreenshot(`vision-${testNum}-${img.label}`);

    const icon = status === 'pass' || status === 'partial' ? '✅' :
                 status === 'false_positive' ? '⚠️' :
                 status === 'timeout' ? '⏱️' : '❌';
    console.log(`${icon} ${status} (${itemCount} items, ${elapsed}ms)`);

    results.push({
      index: start + i,
      label: img.label,
      category: img.category,
      url: img.url,
      status,
      itemCount,
      minItems: img.minItems,
      elapsed,
      screenshot: screenshotPath,
    });

  } catch (e) {
    errors++;
    console.log(`💥 error: ${e.message}`);
    results.push({
      index: start + i,
      label: img.label,
      category: img.category,
      status: 'error',
      error: e.message,
      elapsed: Date.now() - startTime,
    });
  }

  if ((i + 1) % 10 === 0 && i < subset.length - 1) {
    console.log(`   ⏸  Pausing 10s for rate limit (batch ${Math.floor(i / 10) + 1} complete)...`);
    await delay(10000);
  } else {
    await delay(2000);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 VISION STRESS TEST RESULTS`);
console.log(`${'='.repeat(60)}`);
console.log(`   Total:  ${subset.length}`);
console.log(`   Passed: ${passed} ✅`);
console.log(`   Failed: ${failed} ❌`);
console.log(`   Errors: ${errors} 💥`);
console.log(`   Avg response: ${Math.round(results.filter(r => r.elapsed).reduce((s, r) => s + r.elapsed, 0) / results.length)}ms`);
console.log();

const byCategory = {};
for (const r of results) {
  if (!byCategory[r.category]) byCategory[r.category] = { pass: 0, fail: 0, total: 0 };
  byCategory[r.category].total++;
  if (r.status === 'pass' || r.status === 'partial') byCategory[r.category].pass++;
  else byCategory[r.category].fail++;
}
for (const [cat, stats] of Object.entries(byCategory)) {
  console.log(`   ${cat}: ${stats.pass}/${stats.total} passed`);
}

const report = {
  runId: timestamp(),
  suite: 'vision-stress',
  total: subset.length,
  passed,
  failed,
  errors,
  results,
};
const reportDir = new URL('./output/', import.meta.url).pathname;
fs.writeFileSync(`${reportDir}vision-report.json`, JSON.stringify(report, null, 2));
console.log(`\n📄 Report saved: output/vision-report.json`);
