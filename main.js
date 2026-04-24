import Dexie from 'dexie';

export const APP_VERSION = '1.0.3';

export function formatDate(dateString) {
  const d = new Date(dateString);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export function generateCsv(records) {
  return "date,sys,dia,pulse\n" + records.map(r => `${r.date},${r.sys},${r.dia},${r.pulse}`).join("\n");
}

export function parseCsvToRecords(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim() !== '');
  return lines.slice(1).map(line => {
    const [date, sys, dia, pulse] = line.split(',');
    return { date, sys: parseInt(sys), dia: parseInt(dia), pulse: parseInt(pulse) };
  });
}

export function getLocalDatetimeValue(now = new Date()) {
  const d = new Date(now.getTime());
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

if (typeof window !== 'undefined') {
  initApp();
}

function initApp() {
  const db = new Dexie("BloodPressureDB");
  db.version(1).stores({ records: '++id, date, sys, dia, pulse' });

  const manifest = {
    name: "血圧手帳 PWA",
    short_name: "血圧手帳",
    start_url: location.href,
    display: "standalone",
    background_color: "#f8f9fa",
    theme_color: "#007bff",
    icons: [{
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23007bff'/%3E%3Ctext x='50' y='65' font-size='40' fill='white' text-anchor='middle'%3EBP%3C/text%3E%3C/svg%3E",
      sizes: "192x192",
      type: "image/svg+xml",
      purpose: "any maskable"
    }]
  };
  document.getElementById('dynamic-manifest').href = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
  );

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW登録エラー:', err));
  }

  let deferredPrompt;
  const installBanner = document.getElementById('install-banner');
  const btnInstall = document.getElementById('btn-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.style.display = 'block';
  });

  btnInstall.addEventListener('click', async () => {
    installBanner.style.display = 'none';
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
  });

  const pages = document.querySelectorAll('.page');
  const navBtns = document.querySelectorAll('.nav-btn');

  function showPage(targetId) {
    pages.forEach(p => p.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    document.querySelector(`[data-target="${targetId}"]`).classList.add('active');
    if (targetId === 'page-list') loadList();
    if (targetId === 'page-graph') loadGraph();
    if (targetId === 'page-settings') loadSettings();
    if (targetId === 'page-record') {
      if (!document.getElementById('edit-id').value) initForm();
    } else {
      stopCamera();
      resetCameraUI();
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (!document.getElementById(target).classList.contains('active')) {
        history.pushState({ page: target }, '');
      }
      showPage(target);
    });
  });

  history.replaceState({ page: 'page-record' }, '');

  window.addEventListener('popstate', (e) => {
    const page = e.state?.page ?? 'page-record';
    showPage(page);
  });

  function loadSettings() {
    document.getElementById('input-api-key').value = localStorage.getItem('gemini_api_key') || '';
    document.getElementById('app-version').textContent = APP_VERSION;
    const qrcodeContainer = document.getElementById('qrcode-container');
    const currentUrl = encodeURIComponent(window.location.href);
    if (qrcodeContainer) {
      qrcodeContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentUrl}" alt="QR Code" style="max-width: 150px; width: 100%;">`;
    }
  }

  document.getElementById('btn-save-apikey').addEventListener('click', () => {
    const apiKey = document.getElementById('input-api-key').value.trim();
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
      alert('APIキーを保存しました。');
    } else {
      localStorage.removeItem('gemini_api_key');
      alert('APIキーを削除しました。');
    }
  });

  const video = document.getElementById('camera');
  const canvas = document.getElementById('canvas');
  let stream = null;
  const btnStartCamera = document.getElementById('btn-start-camera');
  const btnCapture = document.getElementById('btn-capture');

  function resetCameraUI() {
    video.style.display = 'none';
    btnStartCamera.style.display = 'block';
    btnCapture.style.display = 'none';
  }

  async function startCamera() {
    if (stream) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream;
      video.style.display = 'block';
      btnStartCamera.style.display = 'none';
      btnCapture.style.display = 'block';
      document.getElementById('ocr-status').textContent = '';
    } catch (err) {
      document.getElementById('ocr-status').textContent = "カメラを起動できませんでした。";
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
      video.srcObject = null;
    }
  }

  btnStartCamera.addEventListener('click', startCamera);

  async function performOCR(base64Image) {
    const apiKey = localStorage.getItem('gemini_api_key');
    const statusEl = document.getElementById('ocr-status');
    if (!apiKey) {
      statusEl.textContent = "設定からAPIキーを登録してください。";
      document.querySelector('[data-target="page-settings"]').click();
      return null;
    }
    statusEl.textContent = "AIで画像を解析中...";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [
          { text: "医療機器の表示を読み取ってください。最高血圧、最低血圧、心拍数を抽出してください。" },
          { inline_data: { mime_type: "image/jpeg", data: base64Image } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            sys: { type: "INTEGER" },
            dia: { type: "INTEGER" },
            pulse: { type: "INTEGER" }
          },
          required: ["sys", "dia", "pulse"]
        }
      }
    };
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      const parsedData = JSON.parse(data.candidates[0].content.parts[0].text);
      statusEl.textContent = "読み取り成功！";
      return parsedData;
    } catch (error) {
      statusEl.textContent = "読み取り失敗";
      return null;
    }
  }

  btnCapture.addEventListener('click', async () => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Image = dataUrl.split(',')[1];
    stopCamera(); resetCameraUI();
    const result = await performOCR(base64Image);
    if (result) {
      document.getElementById('input-sys').value = result.sys;
      document.getElementById('input-dia').value = result.dia;
      document.getElementById('input-pulse').value = result.pulse;
    }
  });

  function initForm() {
    document.getElementById('record-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('btn-delete').style.display = 'none';
    document.getElementById('btn-cancel-edit').style.display = 'none';
    document.getElementById('input-date').value = getLocalDatetimeValue();
  }
  initForm();

  document.getElementById('record-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const record = {
      date: document.getElementById('input-date').value,
      sys: parseInt(document.getElementById('input-sys').value, 10),
      dia: parseInt(document.getElementById('input-dia').value, 10),
      pulse: parseInt(document.getElementById('input-pulse').value, 10)
    };
    if (id) await db.records.update(parseInt(id, 10), record);
    else await db.records.add(record);
    initForm();
    document.querySelector('[data-target="page-list"]').click();
  });

  document.getElementById('btn-delete').addEventListener('click', async () => {
    const id = document.getElementById('edit-id').value;
    if (!id) return;
    if (!confirm('この記録を削除しますか？')) return;
    await db.records.delete(parseInt(id, 10));
    initForm();
    document.querySelector('[data-target="page-list"]').click();
  });

  document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    initForm();
  });

  async function loadList() {
    const records = await db.records.orderBy('date').reverse().toArray();
    const tbody = document.getElementById('record-tbody');
    tbody.innerHTML = '';
    records.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${formatDate(r.date)}</td><td>${r.sys}</td><td>${r.dia}</td><td>${r.pulse}</td>`;
      tr.addEventListener('click', () => {
        document.getElementById('edit-id').value = r.id;
        document.getElementById('input-date').value = r.date;
        document.getElementById('input-sys').value = r.sys;
        document.getElementById('input-dia').value = r.dia;
        document.getElementById('input-pulse').value = r.pulse;
        document.getElementById('btn-delete').style.display = 'block';
        document.getElementById('btn-cancel-edit').style.display = 'block';
        document.querySelector('[data-target="page-record"]').click();
      });
      tbody.appendChild(tr);
    });
  }

  let chartInstance = null;
  async function loadGraph() {
    const records = await db.records.orderBy('date').toArray();
    const ctx = document.getElementById('bpChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: records.map(r => formatDate(r.date)),
        datasets: [
          { label: '最高血圧', data: records.map(r => r.sys), borderColor: '#dc3545', fill: false },
          { label: '最低血圧', data: records.map(r => r.dia), borderColor: '#007bff', fill: false }
        ]
      }
    });
  }

  document.getElementById('btn-export').addEventListener('click', async () => {
    const records = await db.records.orderBy('date').toArray();
    const blob = new Blob([generateCsv(records)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'blood_pressure.csv';
    a.click();
  });

  document.getElementById('input-import').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const parsed = parseCsvToRecords(event.target.result);
      const existing = await db.records.toArray();
      const existingKeys = new Set(existing.map(r => `${r.date}|${r.sys}|${r.dia}|${r.pulse}`));
      const toAdd = parsed.filter(r => !existingKeys.has(`${r.date}|${r.sys}|${r.dia}|${r.pulse}`));
      if (toAdd.length > 0) await db.records.bulkAdd(toAdd);
      alert(`インポート完了（${toAdd.length}件追加、${parsed.length - toAdd.length}件スキップ）`);
    };
    reader.readAsText(e.target.files[0]);
  });
}
