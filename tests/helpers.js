// index.html から抽出した純粋関数群（テスト用）

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

// index.html の initForm() 内のタイムゾーン変換ロジックを関数化
export function getLocalDatetimeValue(now = new Date()) {
  const d = new Date(now.getTime());
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
