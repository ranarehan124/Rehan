function getStatus(id) {
  return document.getElementById(id);
}

async function postJSON(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Server error');
  }

  return response.json();
}

function setStatus(el, message, type = 'normal') {
  el.innerHTML = message;
  el.style.color = type === 'error' ? '#ffb3b3' : '#d8d8ff';
}

function makeLink(url, text) {
  return `<a href="${url}" target="_blank" rel="noreferrer">${text}</a>`;
}

function triggerFileDownload(url) {
  const fileName = url.split('/').pop();
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = decodeURIComponent(fileName);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

const downloadForm = document.getElementById('downloadForm');
const convertForm = document.getElementById('convertForm');
const aiForm = document.getElementById('aiForm');

downloadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = getStatus('downloadStatus');
  setStatus(status, 'Preparing download...');

  const url = document.getElementById('downloadUrl').value.trim();
  const type = document.getElementById('downloadType').value;
  const quality = document.getElementById('downloadQuality').value;

  try {
    const result = await postJSON('/api/download', { url, type, quality });
    setStatus(status, `Download started. If it does not start automatically, use ${makeLink(result.url, 'this link')}.`);
    triggerFileDownload(result.url);
  } catch (error) {
    setStatus(status, `Error: ${error.message}`, 'error');
  }
});

convertForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = getStatus('convertStatus');
  setStatus(status, 'Converting media to audio...');

  const url = document.getElementById('convertUrl').value.trim();
  const format = document.getElementById('convertFormat').value;

  try {
    const result = await postJSON('/api/convert', { url, format });
    setStatus(status, `Ready! ${makeLink(result.url, 'Download the audio file')}`);
  } catch (error) {
    setStatus(status, `Error: ${error.message}`, 'error');
  }
});

aiForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = getStatus('aiStatus');
  setStatus(status, 'Generating AI insights...');

  const url = document.getElementById('aiUrl').value.trim();
  const goal = document.getElementById('aiGoal').value;

  try {
    const result = await postJSON('/api/ai', { url, goal });
    setStatus(status, result.result);
  } catch (error) {
    setStatus(status, `Error: ${error.message}`, 'error');
  }
});
