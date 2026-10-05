# RSS adapter

`rss.ts` 将配置白名单中的 RSS/Atom 归一化为共享 `WanderItem`。它只在维护／构建环境运行，前端使用已生成的 `data/news.snapshot.json`。

入口：

- `parseRss(xml, source, now)`：解析 XML，输出合法新闻数组。保留可靠发表时间，清理为纯文本，规范化 HTTP(S) 链接并去重；不以 Atom `updated` 代替 `published`。
- `fetchRssFeed(feedUrl)`：获取一个已配置 feed。每次请求 12 秒上限、最多 2 MiB、最多 3 次同源跳转，失败后只重试一次。
- `refreshNewsSnapshot(sources, previous, options)`：按来源更新，返回新快照与状态；测试可注入时钟及 `fetchFeed`，不用联网。

`config/rss-sources.json` 保存来源 URL、feed、所在地、语言、`publisherType`、展示政策、条款链接与核验日期。当前三个来源都使用 `headline-only`。只有核实政策允许后才可启用 `summary-allowed`；不要默认复制 feed 正文或媒体素材。Global Voices 条目必须保留作者与 CC BY 3.0 链接，缺失作者时不收录。依据见 [NEWS_SOURCES.md](../../docs/NEWS_SOURCES.md)。

新闻 ID 来自来源 ID 与 GUID／规范化 URL 的哈希。每来源最多保留 15 条、近 7 天且不在未来的新闻；跨来源按规范化 URL 去重。`publishedAt` 表示发表时间，`generatedAt` 表示快照生成时间，`lastSuccessAt` 表示对应来源最近成功检查时间，不能互相替代。

抓取或解析失败时保留该来源的旧条目与成功时间，记录本次失败。合法空结果会清空旧批次并更新成功时间；禁用来源不发起请求、不保留旧批次。`scripts/refresh-news.ts` 负责读取配置／旧快照，并通过临时文件原子替换目标 JSON。浏览器继续按真实时间执行 7 天有效期和 48 小时来源新鲜度规则。

新增来源先核对官方 feed 与展示条件，再添加配置、固定样本及必要的归一化处理。新增不同协议时编写独立 adapter，仍输出统一条目与来源状态；不要让页面理解第三方原始数据或直接请求 feed。
