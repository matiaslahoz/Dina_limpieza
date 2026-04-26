import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const escape = (v: unknown): string => {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const toCsv = <T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]) => {
  const header = columns.map((c) => escape(c)).join(',');
  const body = rows.map((r) => columns.map((c) => escape(r[c])).join(',')).join('\n');
  return `${header}\n${body}\n`;
};

export const shareCsv = async (filename: string, csv: string) => {
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: 'utf8' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: filename,
      UTI: 'public.comma-separated-values-text',
    });
  }
};
