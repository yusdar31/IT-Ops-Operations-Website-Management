import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(value) {
  if (!value) return '-';
  return format(new Date(value), 'dd MMM yyyy');
}

export function formatDateTime(value) {
  if (!value) return '-';
  return format(new Date(value), 'dd MMM yyyy, HH:mm');
}

export function formatRelativeTime(value) {
  if (!value) return '-';
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}
