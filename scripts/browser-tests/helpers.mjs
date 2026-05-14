import { evaluate, getPageText } from './gtm.mjs';

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForText(text, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pageText = await getPageText();
    if (pageText && pageText.includes(text)) return true;
    await delay(500);
  }
  return false;
}

export async function waitForEither(texts, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pageText = await getPageText();
    if (pageText) {
      for (const text of texts) {
        if (pageText.includes(text)) return text;
      }
    }
    await delay(500);
  }
  return null;
}

export async function clickByText(text) {
  return evaluate(`
    var els = document.querySelectorAll('div');
    var clicked = false;
    for (var i = 0; i < els.length; i++) {
      if (els[i].textContent.trim() === '${text}' && els[i].childElementCount <= 1) {
        els[i].click();
        clicked = true;
        break;
      }
    }
    clicked;
  `);
}

export async function clickNativeByText(text) {
  return evaluate(`
    var els = document.querySelectorAll('div');
    for (var i = 0; i < els.length; i++) {
      if (els[i].innerText && els[i].innerText.trim() === '${text}' && els[i].childElementCount === 0) {
        els[i].click();
        break;
      }
    }
    true;
  `);
}

export async function injectImageFromUrl(imageUrl) {
  return evaluate(`
    (async () => {
      try {
        var resp = await fetch('${imageUrl}');
        var blob = await resp.blob();
        var dt = new DataTransfer();
        var file = new File([blob], 'test.jpg', { type: 'image/jpeg' });
        dt.items.add(file);
        var input = document.getElementById('camera-file-input');
        if (!input) return { success: false, error: 'no file input found' };
        Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, size: blob.size };
      } catch(e) {
        return { success: false, error: e.message };
      }
    })()
  `);
}

export async function getDetectedItems() {
  return evaluate(`
    var text = document.body.innerText;
    var match = text.match(/We found (\\d+) ingredient/);
    var count = match ? parseInt(match[1]) : 0;
    JSON.stringify({ count, text: text.substring(0, 300) });
  `);
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
}
