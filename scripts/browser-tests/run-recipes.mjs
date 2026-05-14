/**
 * Suite 2: Recipe browsing, rendering, and adaptation testing.
 * Usage: node scripts/browser-tests/run-recipes.mjs
 */
import { navigate, saveScreenshot, evaluate } from './gtm.mjs';
import { delay, waitForText, clickNativeByText, timestamp } from './helpers.mjs';
import fs from 'fs';

const APP = 'http://localhost:8081';
const results = [];

async function fetchRecipes() {
  const queries = [
    'cuisine=italian&number=6',
    'cuisine=mexican&number=6',
    'difficulty=easy&number=6',
    'maxReadyTime=30&number=6',
    'number=6',
  ];
  const allRecipes = [];
  const seenIds = new Set();

  for (const q of queries) {
    try {
      const resp = await fetch(`${APP}/api/recipes/search?${q}`);
      const data = await resp.json();
      for (const r of (data.recipes || [])) {
        const id = r.objectID || r.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          allRecipes.push(r);
        }
      }
    } catch (e) {
      console.log(`  ⚠️  Failed to fetch: ${q} — ${e.message}`);
    }
  }
  return allRecipes.slice(0, 30);
}

async function testRecipeDetail(recipe, index) {
  const id = recipe.objectID || recipe.id;
  const encoded = encodeURIComponent(JSON.stringify(recipe));
  const url = `${APP}/recipes/${id}?recipe=${encoded}`;

  await navigate(url);
  await delay(2000);

  const pageText = await evaluate('document.body.innerText');

  const hasTitle = pageText.includes(recipe.title || '');
  const hasIngredients = pageText.includes('Ingredients');
  const hasInstructions = pageText.includes('Instructions');
  const hasBack = pageText.includes('Back');
  const hasCta = pageText.includes('Make it with what I have');

  const screenshotPath = await saveScreenshot(`recipe-${String(index + 1).padStart(2, '0')}-${(recipe.title || 'untitled').substring(0, 30).replace(/[^a-z0-9]/gi, '-')}`);

  return {
    index,
    id,
    title: recipe.title || 'untitled',
    cuisine: recipe.cuisine || 'unknown',
    hasTitle,
    hasIngredients,
    hasInstructions,
    hasBack,
    hasCta,
    allPassed: hasTitle && hasIngredients && hasInstructions && hasBack && hasCta,
    screenshot: screenshotPath,
  };
}

async function testAdapt(recipe, index) {
  const id = recipe.objectID || recipe.id;
  const encoded = encodeURIComponent(JSON.stringify(recipe));
  await navigate(`${APP}/recipes/${id}?recipe=${encoded}`);
  await delay(2000);

  await clickNativeByText('Make it with what I have');
  const startTime = Date.now();

  const found = await waitForText('Adapted for you', 25000) ||
                await waitForText('Honest take', 5000);
  const elapsed = Date.now() - startTime;

  const pageText = await evaluate('document.body.innerText');
  const hasAdaptation = pageText.includes('Adapted for you') || pageText.includes('Honest take');
  const viability = pageText.includes('Still great') ? 'good' :
                    pageText.includes('Compromised') ? 'compromised' :
                    pageText.includes('Stretch') ? 'stretch' :
                    pageText.includes('Honest take') ? 'not_viable' : 'unknown';

  const screenshotPath = await saveScreenshot(`adapt-${String(index + 1).padStart(2, '0')}-${(recipe.title || '').substring(0, 20).replace(/[^a-z0-9]/gi, '-')}`);

  return {
    index,
    title: recipe.title,
    adapted: hasAdaptation,
    viability,
    elapsed,
    screenshot: screenshotPath,
  };
}

async function main() {
  console.log('\n🍳 Recipe Rendering Test Suite\n');
  console.log('Step 1: Fetching 30 diverse recipes from Algolia...');
  const recipes = await fetchRecipes();
  console.log(`   Got ${recipes.length} unique recipes\n`);

  console.log('Step 2: Testing recipe detail rendering...');
  let detailPassed = 0;
  for (let i = 0; i < recipes.length; i++) {
    const result = await testRecipeDetail(recipes[i], i);
    results.push(result);
    const icon = result.allPassed ? '✅' : '❌';
    console.log(`  ${icon} [${i + 1}/${recipes.length}] ${result.title.substring(0, 40)} (${result.cuisine})`);
    if (!result.allPassed) {
      const missing = [];
      if (!result.hasTitle) missing.push('title');
      if (!result.hasIngredients) missing.push('ingredients');
      if (!result.hasInstructions) missing.push('instructions');
      if (!result.hasBack) missing.push('back');
      if (!result.hasCta) missing.push('cta');
      console.log(`      Missing: ${missing.join(', ')}`);
    } else {
      detailPassed++;
    }
    await delay(500);
  }

  console.log(`\nStep 3: Testing adaptation on 5 recipes...`);
  const adaptResults = [];
  const adaptIndexes = [0, 6, 12, 18, 24].filter(i => i < recipes.length);
  for (const idx of adaptIndexes) {
    console.log(`  Adapting: ${recipes[idx].title?.substring(0, 40)}...`);
    const result = await testAdapt(recipes[idx], idx);
    adaptResults.push(result);
    const icon = result.adapted ? '✅' : '❌';
    console.log(`  ${icon} Viability: ${result.viability} (${result.elapsed}ms)`);
    await delay(3000);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RECIPE TEST RESULTS`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Detail pages: ${detailPassed}/${recipes.length} fully rendered`);
  console.log(`   Adaptations:  ${adaptResults.filter(r => r.adapted).length}/${adaptResults.length} successful`);

  const reportDir = new URL('./output/', import.meta.url).pathname;
  const report = {
    runId: timestamp(),
    suite: 'recipe-rendering',
    detailTests: { total: recipes.length, passed: detailPassed, results },
    adaptTests: { total: adaptResults.length, passed: adaptResults.filter(r => r.adapted).length, results: adaptResults },
  };
  fs.writeFileSync(`${reportDir}recipe-report.json`, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report: output/recipe-report.json`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
