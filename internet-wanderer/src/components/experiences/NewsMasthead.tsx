import { Newspaper } from 'lucide-react';
import type { ContentSource } from '../../domain/item-schema';
import { languageName } from '../../content/format';
export default function NewsMasthead({ source, language }: { source?: ContentSource; language?: string }) {
  return <div className="news-masthead" data-testid="news-masthead"><div><span>A WINDOW, NOT A FEED.</span><strong>The other side.</strong></div><div className="news-origin"><Newspaper size={19} strokeWidth={1.1} /><span>来源所在地<br /><b>{source?.publisherCountry ?? '地区未标注'}</b><i>{languageName(language)}</i></span></div></div>;
}
