import { Asterisk, MousePointer2, Orbit, Paperclip } from 'lucide-react';
import type { WanderItem } from '../../domain/item-schema';
import { domainName } from '../../content/format';

const motifs = [
  { name: 'little-world', caption: 'A SMALL WINDOW TO SOMEWHERE ELSE.', line: 'A whole little world.', Icon: Orbit },
  { name: 'loose-thread', caption: 'ONE LINK CAN LEAD ANYWHERE.', line: 'Follow a loose thread.', Icon: MousePointer2 },
  { name: 'happy-accident', caption: 'FOUND WHILE LOOKING FOR NOTHING.', line: 'A happy little accident.', Icon: Asterisk },
];
export default function ElsewherePostcard({ item }: { item: WanderItem }) {
  const seed = [...item.id].reduce((total, char) => total + char.charCodeAt(0), 0);
  const { name, caption, line, Icon } = motifs[seed % motifs.length]!;
  return <div className={`site-postcard postcard-${name}`} data-testid="elsewhere-postcard" aria-hidden="true">
    <div className="postcard-copy"><span>{caption}</span><strong>{line}</strong><i>{domainName(item.url)} ↗</i></div>
    <div className="postcard-art"><span /><Icon size={76} strokeWidth={.9} /><span /></div>
    <span className="postcard-stamp">WWW<br />↗</span><Paperclip className="postcard-clip" size={23} strokeWidth={1.2} />
  </div>;
}
