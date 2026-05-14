const GTM_URL = 'http://localhost:9223';

export async function sendCommand(command, params = {}) {
  const resp = await fetch(GTM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, params }),
  });
  return resp.json();
}

export async function navigate(url) {
  return sendCommand('navigate', { url });
}

export async function screenshot(format = 'png') {
  await sendCommand('evaluate', { script: 'document.body.style.transform="translateZ(0)"' });
  await new Promise(r => setTimeout(r, 100));
  const result = await sendCommand('screenshot', { format });
  return result?.result?.image || null;
}

export async function saveScreenshot(label) {
  const img = await screenshot();
  if (!img) return null;
  const dir = new URL('./output/screenshots/', import.meta.url).pathname;
  const path = `${dir}${label}.png`;
  const fs = await import('fs');
  fs.writeFileSync(path, Buffer.from(img, 'base64'));
  return path;
}

export async function evaluate(script) {
  const result = await sendCommand('evaluate', { script });
  return result?.result?.result ?? result?.result;
}

export async function mouseClick(x, y) {
  return sendCommand('mouse_click', { x, y });
}

export async function getPageText() {
  return evaluate('document.body.innerText');
}

export async function isReachable() {
  try {
    const resp = await fetch(GTM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'navigate', params: { url: 'about:blank' } }),
    });
    return resp.ok;
  } catch { return false; }
}
