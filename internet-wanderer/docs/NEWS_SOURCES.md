# News Drift：来源与更新

当前配置连接 **Global Voices 的英语、简体中文、日语、法语、西班牙语版本，以及 NASA、European Central Bank**，共 7 个官方 RSS 来源。首批英语来源及政策于 2026-10-02 核验；多语言与历史档案接口于 2026-10-06 另行核验，详细样本、接口选择和失败记录见 [多语言新闻档案](MULTILINGUAL_NEWS_ARCHIVES.md)。

Global Voices 是注册在荷兰的全球作者与翻译网络；语言版本不等于法国、西班牙或日本的当地媒体。NASA 和 ECB 发布机构资讯。来源所在地不表示报道发生地，这些来源也不构成当地媒体或全球新闻的完整覆盖。

## 核验记录

| 来源 | 官方 feed／发现入口 | 条件与本项目采用的字段 |
| --- | --- | --- |
| Global Voices · English | [feed](https://globalvoices.org/feed/) · [RSS 索引](https://globalvoices.org/feeds/) | [Republishing Guidelines](https://globalvoices.org/about/global-voices-attribution-policy/) 采用 Creative Commons Attribution；官网页脚链接 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)。保留标题、文章链接、原作者、已确认的译者、发表时间和许可证链接；从 RSS 的署名 footer 识别原作者，不把 `dc:creator` 一概当成原作者。 |
| Global Voices · 简体中文 | [feed](https://zhs.globalvoices.org/feed/) · [语言主页](https://zhs.globalvoices.org/) | 语言标记 `zh-CN`；采用同一署名政策，保留简体中文版本实际发表时间。 |
| Global Voices · 日本語 | [feed](https://jp.globalvoices.org/feed/) · [语言主页](https://jp.globalvoices.org/) | 语言标记 `ja`；RSS 域名为 `jp`，不能据此把内容语言写成 `jp`。保留原作者、译者及该语言版本实际发表时间。 |
| Global Voices · Français | [feed](https://fr.globalvoices.org/feed/) · [语言主页](https://fr.globalvoices.org/) | 语言标记 `fr`；法语原作和译作均可能出现，从署名标签区分作者与译者。 |
| Global Voices · Español | [feed](https://es.globalvoices.org/feed/) · [语言主页](https://es.globalvoices.org/) | 语言标记 `es`；保留西班牙语版本实际发表时间，不以文章修订时间覆盖它。 |
| NASA | [feed](https://www.nasa.gov/feed/) · [官方 RSS 说明](https://www.nasa.gov/rss-feeds/) | [Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) 允许教育／信息用途，要求署名，第三方版权材料不自动获得许可。仅使用标题、文章链接、发表时间，明确署名 NASA；不下载或展示媒体素材、标志、正文或摘要，不暗示 NASA 为本项目背书。 |
| European Central Bank | [feed](https://www.ecb.europa.eu/rss/press.html) · [RSS 说明](https://www.ecb.europa.eu/home/html/rss.en.html) | [Disclaimer & Copyright](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html) 允许准确再使用网站信息并引用 ECB；带作者的论文等文件另有限制。这里只索引标题、文章链接和发表时间，不再发布论文、演讲正文、摘要或图片。 |

7 个来源均采用 `headline-only`。读取 RSS 的 `content:encoded` 仅用于提取 Global Voices 的署名 footer 与原文证据链接，不把正文、摘要、图片或音视频保存到新闻库或展示到卡片。Global Voices 的第三方媒体素材不随文章的 CC 许可自动授权；数字作者 ID、未确认角色的 RSS 发布者及译者都不能冒充原作者。

核验记录只描述所列请求和政策页的本次结果，不保证所有年份、全部分页、未来地址和条款持续不变。扩大展示字段前重新核对对应政策。2026-10-02 的候选检查中，ESA 通用条款没有提供本项目所需的公开再分发许可；Fed 候选返回 403，USGS／NOAA 候选返回 404，均未启用。

## 更新与历史回填

在应用根目录运行：

```sh
npm run data:refresh
npm run data:backfill -- --from=2004 --to=2026 --pages=2
npm run data:validate
```

配置仍是 `config/rss-sources.json`，采集结果仍是 `data/news.snapshot.json`；不是依靠手写新闻样本扩库。`data:refresh` 更新各来源根 feed 并与已有历史合并；`data:backfill` 对配置中的 Global Voices 语言来源请求 `/YYYY/feed/?paged=N`，按年持续扩充档案。默认年份从 2004 年到执行当年；页数可指定，最多 10 页／年，每次 feed 解析最多接收 15 条。此限制是受控抽样，不代表收齐某年全部新闻；NASA 与 ECB 不套用 Global Voices 的年度路径。

采集只发生在维护／构建环境，浏览器不直连第三方 feed，也不需要 API key。普通无代理环境直接运行上述命令。当前本机 Node.js 采集需要在命令环境中启用现有代理：

```powershell
$env:HTTPS_PROXY = 'http://127.0.0.1:7890'
$env:NODE_USE_ENV_PROXY = '1'
npm run data:backfill -- --from=2004 --to=2026 --pages=2
```

这是本机网络条件，不能把地址硬编码进脚本；其他机器应使用自己的网络配置。使用已有 CA 信任，不关闭 TLS 校验。

每次请求有 12 秒上限，失败最多重试一次；最多接受 2 MiB 响应，只跟随同源且最多 3 次重定向。标题转成纯文本；外链只接受 HTTP(S)，剔除已知跟踪参数，保留实际定位文章的查询参数。ID 根据来源与 GUID 派生，没有 GUID 时使用规范化文章 URL；跨来源按规范化 URL 去重，不按标题猜测同一事件。

只接收带明确时区、可解析且不在未来的发表时间。取消“只留近 7 天”的硬门槛，让早期新闻进入 News Drift 和 Surprise Me；历史新闻不会自动改成 Time Machine 的年份包。`publishedAt` 来自 RSS `pubDate` 或 Atom `published`，不是采集时间、修订时间或 URL 中的日期。对于译作，它表示当前语言版本的发表时间；`evidenceUrls` 中的原文链接也不等于已经核实原语言版本的准确发表时间。

`generatedAt`、`lastAttemptAt` 与 `lastSuccessAt` 记录真实采集／检查时间，不改写旧新闻的 `publishedAt`。48 小时未更新只产生提示，不再作为 News Drift 或 Surprise Me 的进入门槛。

抓取或解析失败时保留已有条目与上一次成功时间，同时记录本次失败。合法空 feed 不删除已导入历史。年度档案无条目或 404 可表示该次档案入口没有可取数据；5xx、超时、无效 XML 则是失败，不能记成成功空结果。一次空响应不能证明该语言从未报道该年。

停用来源不再发起请求，其配置作为来源墓碑保留，历史记录仍可追溯；停用来源的条目退出漫游池。快照先写临时文件，再原子替换目标文件，避免留下半份 JSON。实际导入数量、年份与语言覆盖以本轮采集状态和数据校验为准，不由上述接口样本推算。

## 离线验证

`tests/rss.test.ts` 使用固定 feed 与时钟验证日期、URL、纯文本标题、署名与译者、无全文策略、稳定 ID、去重、历史合并、失败保留及空结果保留；`tests/news-archives.test.ts` 覆盖年度分页、时区跨年、空页和错误响应。本轮实际导入及构建／启动结果见 [验收记录](MULTILINGUAL_NEWS_ARCHIVES.md)。
