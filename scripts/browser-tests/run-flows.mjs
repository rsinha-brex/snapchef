/**
 * Suite 3: Full app flow testing — counter, pantry, recipes, navigation, edge cases.
 * Usage: node scripts/browser-tests/run-flows.mjs
 */
import { navigate, saveScreenshot, evaluate, getPageText } from './gtm.mjs';
import { delay, waitForText, clickNativeByText, clickByText, timestamp } from './helpers.mjs';
import fs from 'fs';

const APP = 'http://localhost:8081';
const results = [];
let passed = 0, failed = 0;

function assert(condition, label) {
  if (condition) { passed++; results.push({ label, status: 'pass' }); console.log(`  ✅ ${label}`); }
  else { failed++; results.push({ label, status: 'fail' }); console.log(`  ❌ ${label}`); }
}

async function suiteCounter() {
  console.log('\n📦 3A: Counter Flow');

  await navigate(`${APP}/counter`);
  await delay(2000);
  let text = await getPageText();
  assert(text.includes("What's on your counter"), 'Empty counter state renders');
  assert(text.includes('items in your pantry'), 'Pantry count shown');
  await saveScreenshot('flow-counter-01-empty');

  await clickNativeByText('Add manually');
  await delay(1000);
  text = await getPageText();
  assert(text.includes('Add ingredients'), 'ManualAddSheet opens');
  await saveScreenshot('flow-counter-02-manual-sheet');

  await clickNativeByText('garlic');
  await delay(500);
  await clickNativeByText('eggs');
  await delay(500);
  await clickNativeByText('pasta');
  await delay(500);
  await clickNativeByText('Done');
  await delay(1000);
  text = await getPageText();
  assert(text.includes('garlic') && text.includes('eggs'), 'Items added to counter');
  assert(text.includes('3 item'), 'Counter shows correct count');
  await saveScreenshot('flow-counter-03-populated');

  await clickNativeByText('Find recipes');
  await delay(3000);
  text = await getPageText();
  const hasRecipes = text.includes('recipes') || text.includes('for you');
  assert(hasRecipes, 'Match screen loads');
  await saveScreenshot('flow-counter-04-match');

  await navigate(`${APP}/counter`);
  await delay(2000);
  await clickNativeByText('Clear all');
  await delay(1000);
  text = await getPageText();
  assert(text.includes("What's on your counter"), 'Clear all resets to empty');
  await saveScreenshot('flow-counter-05-cleared');
}

async function suitePantry() {
  console.log('\n🗄️ 3B: Pantry Flow');

  await navigate(`${APP}/pantry`);
  await delay(2000);
  let text = await getPageText();
  assert(text.includes('Your pantry'), 'Pantry page renders');
  assert(text.includes('PRODUCE'), 'Categories grouped');
  assert(text.includes('Garlic'), 'Items visible');
  await saveScreenshot('flow-pantry-01-initial');

  await clickNativeByText('Edit');
  await delay(1000);
  text = await getPageText();
  assert(text.includes('Done'), 'Edit mode active (shows Done)');
  await saveScreenshot('flow-pantry-02-edit-mode');

  await clickNativeByText('Done');
  await delay(500);
  text = await getPageText();
  assert(text.includes('Edit'), 'Exit edit mode (shows Edit)');
  await saveScreenshot('flow-pantry-03-done');
}

async function suiteRecipes() {
  console.log('\n📖 3C: Recipes Flow');

  await navigate(`${APP}/recipes`);
  await delay(3000);
  let text = await getPageText();
  assert(text.includes('cook'), 'Greeting renders');
  assert(text.includes('Filters'), 'Filters button visible');
  assert(text.includes('AI Search'), 'AI Search toggle visible');
  assert(text.includes('1,000,000') || text.includes('recipes'), 'Result count shown');
  await saveScreenshot('flow-recipes-01-browse');

  await evaluate(`
    var els = document.querySelectorAll('div');
    for (var i = 0; i < els.length; i++) {
      if (els[i].childElementCount === 2 && els[i].textContent.trim() === 'Filters') {
        els[i].click(); break;
      }
    }
  `);
  await delay(1000);
  text = await getPageText();
  assert(text.includes('CUISINE') && text.includes('TIME'), 'Filter sheet opens');
  await saveScreenshot('flow-recipes-02-filters');

  await clickNativeByText('Done');
  await delay(1000);
  await saveScreenshot('flow-recipes-03-filtered');
}

async function suiteNavigation() {
  console.log('\n🧭 3D: Navigation');

  const tabs = ['recipes', 'counter', 'pantry', 'saved'];
  for (const tab of tabs) {
    await navigate(`${APP}/${tab}`);
    await delay(2000);
    const text = await getPageText();
    assert(text.length > 20, `Tab /${tab} loads content`);
    await saveScreenshot(`flow-nav-${tab}`);
  }

  await navigate(`${APP}/recipes/test-deep-link`);
  await delay(2000);
  const text = await getPageText();
  assert(text.includes('Back'), 'Deep link recipe detail has Back button');
  await saveScreenshot('flow-nav-deeplink');
}

async function suiteEdgeCases() {
  console.log('\n⚡ 3E: Edge Cases');

  const edgeRecipe = {
    title: 'A'.repeat(120),
    cuisine: 'test',
    total_time_minutes: 0,
    difficulty: 'unknown',
    ingredients: [],
    instructions: [],
    ingredient_names: [],
  };
  const encoded = encodeURIComponent(JSON.stringify(edgeRecipe));
  await navigate(`${APP}/recipes/edge-1?recipe=${encoded}`);
  await delay(2000);
  let text = await getPageText();
  assert(text.includes('Instructions not available'), 'No-instructions fallback shows');
  assert(text.includes('0 min'), 'Zero time renders');
  await saveScreenshot('flow-edge-01-no-instructions');

  const longTitleRecipe = { ...edgeRecipe, title: 'The Most Incredibly Delicious Triple-Layer Chocolate Fudge Brownie Cake with Raspberry Compote and Fresh Mint Garnish' };
  const encoded2 = encodeURIComponent(JSON.stringify(longTitleRecipe));
  await navigate(`${APP}/recipes/edge-2?recipe=${encoded2}`);
  await delay(2000);
  text = await getPageText();
  assert(text.includes('Triple-Layer'), 'Long title renders');
  await saveScreenshot('flow-edge-02-long-title');

  const manyIngredients = {
    title: 'Complex Recipe',
    cuisine: 'french',
    total_time_minutes: 180,
    ingredients: Array.from({ length: 25 }, (_, i) => ({ name: `ingredient-${i + 1}` })),
    instructions: ['Step 1', 'Step 2', 'Step 3'],
    ingredient_names: Array.from({ length: 25 }, (_, i) => `ingredient-${i + 1}`),
  };
  const encoded3 = encodeURIComponent(JSON.stringify(manyIngredients));
  await navigate(`${APP}/recipes/edge-3?recipe=${encoded3}`);
  await delay(2000);
  text = await getPageText();
  assert(text.includes('ingredient-25'), '25 ingredients all render');
  assert(text.includes('Step 3'), 'Instructions render');
  await saveScreenshot('flow-edge-03-many-ingredients');
}

async function main() {
  console.log('🧪 Full App Flow Testing\n');
  console.log(`Started: ${new Date().toISOString()}`);

  await suiteCounter();
  await suitePantry();
  await suiteRecipes();
  await suiteNavigation();
  await suiteEdgeCases();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 FLOW TEST RESULTS`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Total:  ${passed + failed}`);
  console.log(`   Passed: ${passed} ✅`);
  console.log(`   Failed: ${failed} ❌`);

  const reportDir = new URL('./output/', import.meta.url).pathname;
  const report = { runId: timestamp(), suite: 'app-flows', total: passed + failed, passed, failed, results };
  fs.writeFileSync(`${reportDir}flow-report.json`, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report: output/flow-report.json`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
