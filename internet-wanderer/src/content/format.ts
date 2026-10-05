export function domainName(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return '未知地址'; }
}

export function formatDate(value: string, time = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(time ? { hour: '2-digit', minute: '2-digit' } as const : {}),
  }).format(date);
}

export function languageName(code?: string): string {
  return ({ en: '英语', zh: '中文', 'zh-CN': '中文', ja: '日语', fr: '法语', es: '西班牙语', de: '德语', und: '语言未标注', multilingual: '多语言' } as Record<string, string>)[code ?? ''] ?? code ?? '语言未标注';
}
