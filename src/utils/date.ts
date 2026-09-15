export function formatGermanTimeAgo(timestamp: number | string): string {
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (!time || isNaN(time)) return 'Aktuell';

  const diffMs = Date.now() - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return 'Gerade eben';
  }
  if (diffMin < 60) {
    return `vor ${diffMin} ${diffMin === 1 ? 'Minute' : 'Minuten'}`;
  }
  if (diffHours < 24) {
    return `vor ${diffHours} ${diffHours === 1 ? 'Stunde' : 'Stunden'}`;
  }
  if (diffDays === 1) {
    const d = new Date(time);
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `Gestern, ${hours}:${mins}`;
  }
  if (diffDays < 7) {
    return `vor ${diffDays} Tagen`;
  }

  const date = new Date(time);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
