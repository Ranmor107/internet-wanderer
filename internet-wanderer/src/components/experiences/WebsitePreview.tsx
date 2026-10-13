import type { WanderItem } from '../../domain/item-schema';
import { domainName } from '../../content/format';

export const FEATURED_SITE_IDS = ['site-cat-bounce', 'site-moon-one-pixel', 'site-window-swap', 'site-sandspiel', 'site-nicky-case', 'site-camerons-world'];

function motif(item: WanderItem) {
  if (item.id === 'site-cat-bounce') return 'cats';
  if (item.id === 'site-moon-one-pixel' || item.tags?.some(tag => ['太空', '天文'].includes(tag))) return 'space';
  if (item.id === 'site-window-swap' || item.tags?.includes('地图')) return 'window';
  if (item.id === 'site-sandspiel' || item.tags?.some(tag => ['绘画', '生成艺术'].includes(tag))) return 'sand';
  if (item.id === 'site-nicky-case' || item.tags?.includes('小游戏')) return 'play';
  if (item.id === 'site-camerons-world' || item.id === 'site-wiby') return 'web';
  if (item.tags?.some(tag => ['音乐', '声音'].includes(tag))) return 'sound';
  return 'human';
}

export default function WebsitePreview({ item, small = false }: { item: WanderItem; small?: boolean }) {
  const kind = motif(item);
  return <div className={`website-preview preview-${kind} ${small ? 'preview-small' : ''}`} data-testid="website-preview" aria-label={`${item.title} 的原创视觉示意`}>
    <span className="preview-label">WEBSITE STUDY / 示意</span>
    <svg viewBox="0 0 480 250" fill="none" aria-hidden="true">
      {kind === 'cats' && <g fill="currentColor">{[[65, 70, -24], [355, 45, 18], [280, 184, -12], [425, 186, 36]].map(([x, y, angle], index) => <g key={index} transform={`translate(${x} ${y}) rotate(${angle})`}><path d="M-22 4L-25-22L-8-11Q0-15 8-11L25-22L22 4Q34 24 14 32L10 54L-4 52L-9 31Q-28 27-22 4Z" /><path d="M16 25Q55 50 42 10" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></g>)}</g>}
      {kind === 'space' && <><path d="M20 127H460" stroke="#799aa8" strokeDasharray="2 8" /><circle cx="235" cy="127" r="4" fill="#f2e4bf" /><circle cx="235" cy="127" r="55" stroke="#5c7c89" /><path d="M235 61V37M178 127H151" stroke="#5c7c89" /><g fill="#a6bec4">{[[42, 44], [111, 207], [388, 66], [448, 227], [319, 27], [39, 208]].map(([x, y], index) => <circle key={index} cx={x} cy={y} r="1.5" />)}</g></>}
      {kind === 'window' && <><rect x="110" y="20" width="260" height="220" rx="85" fill="#bdd1cd" /><path d="M118 183Q170 101 227 160T365 128V233H118Z" fill="#5b8170" /><path d="M117 209Q220 142 365 197V238H117Z" fill="#33594d" /><circle cx="297" cy="74" r="22" fill="#f0d787" /><path d="M111 242V112a130 91 0 01260 0v130M241 30V242M111 130H371" stroke="#efeee3" strokeWidth="13" /></>}
      {kind === 'sand' && <><path d="M0 188H50V160H99V184H142V148H184V171H225V208H280V182H319V162H370V198H415V154H480V250H0Z" fill="#d8a64f" /><path d="M0 219H78V198H131V225H189V210H262V237H343V206H401V223H480V250H0Z" fill="#bd6648" /><rect x="335" y="40" width="55" height="55" fill="#e6ba61" /><g fill="#586e77">{[[66, 53], [79, 65], [53, 77], [92, 81], [67, 96], [80, 110], [55, 123]].map(([x, y], index) => <rect key={index} x={x} y={y} width="9" height="9" />)}</g></>}
      {kind === 'play' && <><rect x="85" y="100" width="90" height="90" rx="7" fill="#d9a958" transform="rotate(-10 130 145)" /><path d="M310 89L365 187H255Z" fill="#b96651" /><g stroke="#272e2b" strokeWidth="3" strokeLinecap="round"><path d="M111 136v5m28-10v5m-21 21q15 10 23-5M296 147v5m24-5v5m-20 12h16M160 204l-8 17m185-17l11 17" /><path d="M185 49h80v42h-17l-14 13V91h-49Z" fill="#f8f6e9" /></g></>}
      {kind === 'web' && <><rect x="45" y="49" width="190" height="120" fill="#c1c5e6" transform="rotate(-8 45 49)" /><rect x="207" y="100" width="218" height="120" fill="#ede49f" transform="rotate(6 207 100)" /><g stroke="#64579a" strokeWidth="2"><path d="M63 75l16 15 31-32M291 142h91m-91 18h63m-63 18h78" /><rect x="335" y="35" width="60" height="43" fill="#e3c7cc" /><path d="M342 54h46m-46 10h31" /></g><path d="M73 195l23-16 23 16-23 16Z" fill="#a66f8a" /></>}
      {kind === 'sound' && <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">{[26, 48, 78, 37, 98, 65, 42, 84, 56, 23, 61, 94, 38].map((height, index) => <path key={index} d={`M${65 + index * 29} ${125 - height / 2}v${height}`} />)}</g>}
      {kind === 'human' && <><path d="M91 55h298v151H91Z" stroke="currentColor" strokeWidth="2" /><path d="M91 83h298M106 69h6m8 0h6m8 0h6M121 111h122m-122 18h182m-182 18h159" stroke="currentColor" strokeWidth="2" /><circle cx="341" cy="171" r="26" fill="#d4bf7a" /><path d="M330 167h22m-11-11v22" stroke="#272e2b" strokeWidth="2" /></>}
    </svg>
    <strong className="preview-phrase">{({ cats: 'Gravity, but cats.', space: 'A dot. An entire universe.', window: 'Borrow a little view.', sand: 'Make a tiny world.', play: 'What if…?', web: 'Welcome to my corner.', sound: 'A different kind of noise.', human: domainName(item.url) })[kind]}</strong>
  </div>;
}
