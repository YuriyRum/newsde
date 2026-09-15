import { AppLanguage } from '../types.ts';

export function formatTimeAgo(timestamp: number | string, lang: AppLanguage = 'de'): string {
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (!time || isNaN(time)) return lang === 'ru' ? 'Сейчас' : 'Aktuell';

  const diffMs = Date.now() - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (lang === 'ru') {
    if (diffSec < 60) {
      return 'Только что';
    }
    if (diffMin < 60) {
      if (diffMin === 1) return '1 минуту назад';
      if (diffMin >= 2 && diffMin <= 4) return `${diffMin} минуты назад`;
      return `${diffMin} мин. назад`;
    }
    if (diffHours < 24) {
      if (diffHours === 1) return '1 час назад';
      if (diffHours >= 2 && diffHours <= 4) return `${diffHours} часа назад`;
      return `${diffHours} ч. назад`;
    }
    if (diffDays === 1) {
      const d = new Date(time);
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      return `Вчера, ${hours}:${mins}`;
    }
    if (diffDays < 7) {
      if (diffDays === 1) return '1 день назад';
      if (diffDays >= 2 && diffDays <= 4) return `${diffDays} дня назад`;
      return `${diffDays} дн. назад`;
    }

    const date = new Date(time);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // German format
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

export function formatGermanTimeAgo(timestamp: number | string): string {
  return formatTimeAgo(timestamp, 'de');
}
