import { Link } from 'react-router-dom';
import { Compass, ExternalLink, Globe2 } from 'lucide-react';
import { formatDate } from '../content/format';
import { useContent } from '../app/content-context';

export default function About() {
  const { repository: { sources, years, websiteCount, newsSnapshot }, runtime: contentRuntime } = useContent();
  const feeds = sources.filter((source) => source.kind === 'rss' && source.enabled);
  return <main className="about-page page-enter">
    <span className="eyebrow">A NOTE FROM THE WANDERER</span>
    <h1>The internet used to<br />feel <em>bigger.</em></h1>
    <p className="about-lead">我们没有走到互联网的尽头。<br />只是太久没有走出熟悉的那几条路。</p>
    {contentRuntime.isDemo && <p className="demo-note"><span>DEMO EDITION</span> 当前是静态内容体验。新闻使用 {contentRuntime.snapshotDate ? formatDate(contentRuntime.snapshotDate) : '已保存'} 的样本，不实时更新；点击外站链接才会离开本站。</p>}
    <div className="about-prose"><p>Internet Wanderer 是一个用来闲逛的小地方。这里不要求你输入问题，也不急着告诉你最佳答案。它想找回的，是点开一个陌生链接时，那一点不知道接下来会发生什么的感觉。</p><p>内容由人工挑选，去向交给偶然。你可能遇见一个小得不能再小的个人项目，一则远处的消息，或一张过去留下的网页。</p></div>
    <div className="about-divider"><Compass size={28} strokeWidth={1} /></div>
    <section className="about-section"><div className="section-number">01 /</div><div><h2>这些入口从哪里来</h2><p>目前有 {websiteCount} 个精选网站，以及 {years.map((year) => year.year).join('、')} 年的历史切片。网站介绍由我们撰写；历史事件提供参考来源，网页存档标明实际保存时间。</p><p>Time Machine 是几个年份的小窗口，不是完整的历史互联网。旧页面可能缺少图片，进入外站后，后续链接也可能离开原来的年份。</p></div></section>
    <section className="about-section"><div className="section-number">02 /</div><div><h2>News Drift 的边界</h2><p>目前以英语内容为主，收录 Global Voices 的国际报道，以及 NASA 和欧洲央行的机构更新。这里提供另一种视角，不代表全球新闻全貌。卡片里的地区指来源所在地。</p><p>实时模式只展示近七天内的条目，长时间未更新的来源会退出 Surprise Me。演示模式以样本生成日为参考时间，便于随时体验。每条消息保留真实发表时间、来源和原文入口。</p><div className="about-sources">{feeds.map((source) => <div key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer"><Globe2 size={17} />{source.name}<ExternalLink size={14} /></a><span>{source.publisherType === 'institution' ? '机构资讯' : '新闻报道'} · {source.publisherCountry}</span><span>{newsSnapshot.sourceStates[source.id]?.lastSuccessAt ? `最近更新 ${formatDate(newsSnapshot.sourceStates[source.id].lastSuccessAt!, true)}` : '暂未成功更新'}</span>{source.termsUrl && <a className="terms-link" href={source.termsUrl} target="_blank" rel="noopener noreferrer">来源使用说明</a>}</div>)}</div><p>Global Voices 内容按 <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a> 标注作者及原文链接。本站不转载文章全文或新闻图片。</p></div></section>
    <section className="about-section"><div className="section-number">03 /</div><div><h2>发现留在你这里</h2><p>无需注册，没有兴趣画像，也没有行为追踪脚本。“最近遇见”最多保留 20 条，存储在当前浏览器里，随时可以清空。它记录你在这里见到的卡片，不记录你在外站读了什么。</p><p>值得留下的内容可以单独收藏，最多 500 条。收藏保留链接、日期和来源署名，支持导出备份、在另一台设备合并导入；清空足迹不会删除收藏。备份只在你的设备上处理，不会上传。</p><p>已收藏的新闻到期后仍可作为旧闻打开，不会因此重新进入新闻漫游池。导入的内容可能只保留保存时的信息，外站也可能改变或消失。</p><p>遇到失效页面，回到这里换一站；发现有问题的条目，可以把标题和链接告诉分享这个网站给你的人。</p></div></section>
    <div className="about-last"><p>世界很大。偶尔走错路，也很好。</p><Link className="surprise-button" to="/wander?mode=surprise"><Compass size={20} />继续漫游</Link></div>
  </main>;
}
