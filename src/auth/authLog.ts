// Buffer de eventos compartido para debug. Cualquier parte de la app puede
// llamar pushAuthLog(...) y la pantalla de login los muestra.

type Listener = (logs: string[]) => void;

const buffer: string[] = [];
const listeners = new Set<Listener>();

const stamp = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d
    .getMilliseconds()
    .toString()
    .padStart(3, '0')}`;
};

export const pushAuthLog = (msg: string, extra?: unknown) => {
  let suffix = '';
  if (extra !== undefined) {
    try {
      suffix = ' ' + (typeof extra === 'string' ? extra : JSON.stringify(extra));
    } catch {
      suffix = ' [unserializable]';
    }
  }
  const line = `[${stamp()}] ${msg}${suffix}`;
  buffer.push(line);
  while (buffer.length > 30) buffer.shift();
  if (__DEV__) console.log(line);
  listeners.forEach((l) => l([...buffer]));
};

export const subscribeAuthLogs = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener([...buffer]);
  return () => {
    listeners.delete(listener);
  };
};

export const clearAuthLogs = () => {
  buffer.length = 0;
  listeners.forEach((l) => l([]));
};
