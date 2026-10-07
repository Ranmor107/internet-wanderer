# RSS adapter

`rss.ts` 将配置白名单中的 RSS/Atom 归一化为共享 `WanderItem`。它只在维护／构建环境运行，前端使用已生成的 `data/news.snapshot.json`。

入口：

- `parseRss(xml, source, now)`：解析 XML，输出合法新闻数组。保留可靠发表时间、纯文本标题和规范化 HTTP(S) 链接；不以 Atom `updated` 代替 `published`，不因新闻较早就剔除它。每次 feed 最多接收 15 条。
- `fetchRssFeed(feedUrl)`：获取已配置 feed。每次请求 12 秒上限、最多 2 MiB、最多 3 次同源跳转，失败后只重试一次。
- `refreshNewsSnapshot(sources, previous, options)`：按来源更新并合并已有历史，返回新快照与真实采集状态；测试可注入时钟和 `fetchFeed`，不用联网。
- `scripts/backfill-news.ts`：按年与分页读取 Global Voices 档案，复用同一 RSS 协议和归一化逻辑。不是另一个新闻全文抓取器。

`config/rss-sources.json` 保存来源 URL、feed、所在地、语言、`publisherType`、展示政策、条款链接与核验日期。当前 7 个来源为 Global Voices 的 `en`、`zh-CN`、`ja`、`fr`、`es` 版本，以及 NASA、ECB；均使用 `headline-only`。来源所在地与输出语言分别记录，不能把 Global Voices 语言子站标为当地媒体。只有核实政策允许后才可扩大展示字段。

Global Voices 的 `content:encoded` 末尾包含 `gv-rss-footer`，其 `text-credits-section` 区分原作者和译者。解析该 footer 内所有作者／译者链接的纯文本署名，并保留原文 `source-link` 到 `evidenceUrls`；不保存或显示 RSS 正文和图片。`dc:creator` 在译作中可能只指译者，不能直接作为原作者。英语站也有其他语言译成英语的文章。只有保留可确认的作者才能按已核实的署名政策收录；无法识别角色时不要伪造原作者或把 REST 数字 ID 当姓名。Global Voices 同时保留 CC BY 3.0 链接。实际标签与证据见 [多语言新闻档案](../../docs/MULTILINGUAL_NEWS_ARCHIVES.md)，政策说明见 [NEWS_SOURCES.md](../../docs/NEWS_SOURCES.md)。

新闻 ID 来自来源 ID 与 GUID／规范化 URL 的哈希，跨来源按规范化 URL 去重，不按标题合并不同语言的文章。`publishedAt` 是当前语言版本的发表时间；`generatedAt` 是快照生成时间，`lastSuccessAt` 是来源最近成功检查时间，不能互相替代。日期缺少时区、无法解析或在未来的条目被排除；原文链接里的日期不能填成未经核实的原文发表时间。

```sh
npm run data:refresh
npm run data:backfill -- --from=2004 --to=2026 --pages=2
npm run data:validate
```

回填默认从 2004 年到执行当年，Global Voices 年档案地址为 `/YYYY/feed/?paged=N`，最多 10 页／年，每页归一化最多 15 条。页数限制使采集可控，不构成完整年度覆盖声明；NASA 和 ECB 保留其独立根 feed，不猜测它们有相同档案路由。

刷新和回填均合并已有历史；合法空结果不删除历史，抓取／XML 解析失败保留已有条目与成功时间，记录本次失败。无条目／404 与 5xx／超时必须区分，不能把错误页当 RSS 或把失败记为成功空档。停用来源不请求，其配置及旧记录仍保留供溯源，但退出漫游池。快照通过临时文件原子替换。前端的 48 小时更新状态只作提示，不再阻止历史新闻进入 News Drift 或 Surprise Me，也不自动生成 Time Machine 年份包。

普通无代理环境直接运行命令。当前本机 Node.js 请求使用命令环境的 `HTTPS_PROXY=http://127.0.0.1:7890` 与 `NODE_USE_ENV_PROXY=1`；不硬编码代理、不关闭 TLS 校验。新增来源先核对官方 feed、署名和展示条件，再添加配置、固定样本及必要的归一化处理；页面不理解第三方原始 XML，也不直接请求 feed。
