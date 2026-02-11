export function resolveDataPath(dataModel: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  const parts = path.startsWith('/') ? path.slice(1).split('/') : path.split('/');
  let current: unknown = dataModel;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export function setDataPath(dataModel: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const result = { ...dataModel };
  const parts = path.startsWith('/') ? path.slice(1).split('/') : path.split('/');

  if (parts.length === 1) {
    result[parts[0]] = value;
    return result;
  }

  let current: Record<string, unknown> = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current[part] = { ...(current[part] as Record<string, unknown>) };
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return result;
}

export function interpolateString(template: string, dataModel: Record<string, unknown>): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, expr) => {
    const val = resolveDataPath(dataModel, expr.trim());
    return val !== undefined ? String(val) : '';
  });
}
