// Export and import of the JSON backup file.
import { S, save, exportData, validateBackup, importData } from './state.js';
import { toast, fmtDate } from './ui.js';

export async function doExport() {
  const payload = exportData();
  const json = JSON.stringify(payload, null, 1);
  const name = `ranked-gym-backup-${payload.exportedAt.slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  let done = false;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Ranked Gym backup' });
      done = true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
    }
  }
  if (!done) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  S.settings.lastBackupAt = payload.exportedAt;
  S.settings.backupSnoozeUntil = null;
  await save('settings');
  toast('Backup exported.');
  return true;
}

export function pickImport(onDone) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.style.display = 'none';
  input.addEventListener('change', async () => {
    const f = input.files && input.files[0];
    input.remove();
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      const info = validateBackup(obj);
      const last = info.last ? `, last on ${fmtDate(info.last, { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
      const ok = confirm(`Import this backup?\n\n${info.workouts} workouts${last}, ${info.exercises} exercises, ${info.templates} templates.\n\nThis replaces all data currently on this phone.`);
      if (!ok) return;
      await importData(obj);
      toast('Backup imported.');
      onDone && onDone();
    } catch (e) {
      alert(e instanceof SyntaxError ? 'That file could not be read as a backup.' : e.message);
    }
  });
  document.body.appendChild(input);
  input.click();
}

export function backupDue() {
  const st = S.settings;
  const now = Date.now();
  if (st.backupSnoozeUntil && new Date(st.backupSnoozeUntil).getTime() > now) return null;
  const sessions = S.workouts.filter(w => !w.placement).length;
  if (!st.lastBackupAt) return sessions >= 3 ? { never: true } : null;
  const days = Math.floor((now - new Date(st.lastBackupAt).getTime()) / 86400000);
  return days >= 14 ? { days } : null;
}
