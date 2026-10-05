# News Drift：来源与更新

首版连接 **Global Voices、NASA、European Central Bank** 三个官方 RSS。2026-10-02 已实际读取 feed 和以下官方政策页，并运行一次采集；每次成功时间记录在 `data/news.snapshot.json` 的 `sourceStates` 中。

这是小规模、英语为主的资讯样本。Global Voices 是全球作者网络，注册在荷兰；NASA 和 ECB 是机构发布的信息。来源所在地不表示报道发生地，也不代表当地媒体或全球新闻的完整覆盖。

## 核验记录

| 来源 | 官方 feed／发现入口 | 条件与本项目采用的字段 |
| --- | --- | --- |
| Global Voices | [feed](https://globalvoices.org/feed/) · [RSS 索引](https://globalvoices.org/feeds/) | [Republishing Guidelines](https://globalvoices.org/about/global-voices-attribution-policy/) 明确采用 Creative Commons Attribution；官网页脚链接 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)。保留标题、原文链接、作者、发表时间，展示许可证链接；作者缺失则不收录。没有复制正文、摘要、图片、音视频。 |
| NASA | [feed](https://www.nasa.gov/feed/) · [官方 RSS 说明](https://www.nasa.gov/rss-feeds/) | [Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) 允许教育／信息用途，要求署名，并说明第三方版权材料不自动获得许可。仅使用官方 feed 的标题、原文链接、发表时间，明确署名 NASA；没有下载或展示媒体素材、标志、正文或摘要，不暗示 NASA 为本项目背书。 |
| European Central Bank | [feed](https://www.ecb.europa.eu/rss/press.html) · [RSS 说明](https://www.ecb.europa.eu/home/html/rss.en.html) | [Disclaimer & Copyright](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html) 允许准确再使用网站信息并引用 ECB；带作者的论文等文件另有限制。这里只索引 feed 标题、原文链接和发表时间，不再发布论文、演讲正文、摘要或图片。 |

上述 feed 和政策页在核验时返回 HTTP 200。这些记录描述本次核实结果，不保证将来地址、条款或内容持续不变。更换来源、扩大字段或加入付费功能前，重新核对对应政策。许可证和源站声明分别适用；本项目的数据记录不构成对所有第三方素材的授权。

本次也读取了 ESA feed 和[网站通用条款](https://www.esa.int/Services/Terms_and_conditions)。通用条款没有提供本项目所需的公开再分发许可，因此没有将 ESA 加入启用配置。Fed 候选地址返回 403，USGS／NOAA 候选 feed 地址返回 404；未将这些失败候选伪装成可用来源。

## 更新方式

```sh
npm run data:refresh
npm run data:validate
```

源码配置：`config/rss-sources.json`。这里单独保存采集来源，前端与 `config/curated-sources.json` 的人工来源映射合并使用。

采集只发生在维护／构建环境，浏览器不读取第三方 feed。不需要 API key。使用系统代理的 Node.js 24 云端环境可运行：

```sh
NODE_USE_ENV_PROXY=1 npm run data:refresh
```

本地没有系统代理时直接使用第一条命令。请使用环境已有的 CA 信任，不关闭 TLS 校验。

每个来源请求总超时 12 秒，失败最多重试一次；最多接受 2 MiB 响应，只跟随同源且最多 3 次重定向。RSS/Atom 归一化后，每来源只纳入近 7 天、带明确时区的可靠发表时间的最多 15 条内容；未来时间和不安全 URL 被排除。Atom 的 `updated` 不充当 `published`。媒体在标题里给出的时间不会覆盖原始发表字段。

标题转成纯文本；摘要仅在配置为 `summary-allowed` 时才会输出，而当前三个来源均为 `headline-only`。所有外链只接受 HTTP(S)，并剔除已知跟踪参数；保留实际定位文章的查询参数。ID 根据来源与 GUID 派生，没有 GUID 时使用规范化原文 URL。跨来源按规范化 URL 去重，不按标题猜测同一事件。

某来源抓取、XML 解析失败时，保留该来源上一次的成功批次和 `lastSuccessAt`，同时记录失败的 `lastAttemptAt` 与状态。一个合法但没有合格近 7 天条目的 feed 是成功空结果，会清空该来源旧批次并更新成功时间。已禁用的来源不会被请求，其旧条目也不会保留。快照先写临时文件，再原子替换目标文件；不会留下写了一半的 JSON。

前端必须继续按真实时间过滤条目：过期新闻不能因文件仍在而重新变成新新闻；超过 48 小时未成功更新的来源不能进入 Surprise Me。普通 News Drift 可以显示未超过 7 天的旧批次，但须同时呈现旧快照提示。

## 离线验证

`tests/rss.test.ts` 用固定 feed 和时钟覆盖 URL 安全、文本归一化、无摘要策略、可靠日期、未来／过期剔除、稳定 ID、两层去重、数量上限、Atom 发表时间、Global Voices 署名、部分失败保留和合法空结果。测试不访问网络。
