# 首批内容核验记录

本次人工策展完成于 **2026-10-02（UTC）**。包含 30 个 Elsewhere 网站，以及 1999、2007、2012 各 6 条历史内容。每个年份均有当年事件、代表性去处、经确认时间戳的网页快照。

2026-10-06 的 6 个非英语网站增补单独记录在 [非英语内容核验记录](NON_ENGLISH_CONTENT_REVIEW.md)，该批使网站池从 30 个扩大到 36 个。2026-10-10 再增加 12 个趣味网站、四个年份及八份精确档案，见 [趣味网站与年份核验](PLAYFUL_SITES_AND_YEARS_REVIEW.md)。当前共 48 个网站、42 条历史切片；下文保留首批核验时的范围和结果。

## 核验方法与边界

- 只对候选入口、必要的历史依据和 3 个 Wayback 精确快照发起有限的只读请求；没有抓取目录、转载正文或保存第三方图片到项目中。
- 30 个精选网站最终入口均返回 HTTP 200。人工检查了页面标题或 HTML 入口；这不是对每个外部站点的完整浏览器交互、音频播放、地区可用性或无障碍验收。
- 历史事件核对了机构原始公告、原始规范或官方说明中的年份／日期。具体日期只写入有明确依据的事件；没有把抓取日期当成事件日期。
- Wayback 使用 availability API 返回的真实快照地址，再请求该精确地址，检查 HTML 标题及 Wayback 注入的原 URL 和抓取时间。3 个快照均为 HTTP 200；未验证所有图片、脚本和子链接，无法保证完整旧站体验。
- `checkedAt` 记录本轮策展核验完成时间，不能解释为持续监测或运行时可用性保证。来源配置中的机构主页用于署名；实际核验的是下表内容入口及历史依据。
- 描述由本项目原创，站点名称用于识别；仅展示这些说明并链接原站，不转载第三方文章或图片。`link-only` 不表示已获得第三方全文或摘要再发布授权。
- 这是以英语页面为主的有限样本，不宣称全球代表性。`und` 表示未给无明显文字的体验推断语言。

## Elsewhere 入口

| 条目 | 最终入口 | 结果 |
| --- | --- | --- |
| Radio Garden | <https://radio.garden/> | HTTP 200 |
| WindowSwap | <https://www.window-swap.com/> | HTTP 200 |
| earth :: 风的地图 | <https://earth.nullschool.net/> | HTTP 200 |
| Radiooooo | <https://app.radiooooo.com/> | HTTP 200 |
| Nicky Case | <https://ncase.me/> | HTTP 200 |
| Bartosz Ciechanowski | <https://ciechanow.ski/> | HTTP 200 |
| Wiby | <https://wiby.me/> | HTTP 200 |
| Marginalia Search | <https://marginalia-search.com/> | HTTP 200 |
| Poolsuite | <https://poolsuite.net/> | HTTP 200 |
| Little Alchemy 2 | <https://littlealchemy2.com/> | HTTP 200 |
| Music for Programming | <https://musicforprogramming.net/> | HTTP 200 |
| Patatap | <https://patatap.com/> | HTTP 200 |
| myNoise | <https://mynoise.net/> | HTTP 200 |
| A Soft Murmur | <https://asoftmurmur.com/> | HTTP 200 |
| Zoomquilt | <https://zoomquilt.org/> | HTTP 200 |
| Pointer Pointer | <https://pointerpointer.com/> | HTTP 200 |
| MapCrunch | <https://www.mapcrunch.com/> | HTTP 200 |
| Stellarium Web | <https://stellarium-web.org/> | HTTP 200 |
| Astronomy Picture of the Day | <https://science.nasa.gov/apod/> | HTTP 200 |
| oimo.io | <https://oimo.io/works> | HTTP 200 |
| Dwitter | <https://www.dwitter.net/> | HTTP 200 |
| The Pudding | <https://pudding.cool/> | HTTP 200 |
| The Public Domain Review | <https://publicdomainreview.org/> | HTTP 200 |
| Explorable Explanations | <https://explorabl.es/> | HTTP 200 |
| Webb Compare | <https://www.webbcompare.com/> | HTTP 200 |
| If the Moon Were Only 1 Pixel | <https://www.joshworth.com/dev/pixelspace/pixelspace_solarsystem.html> | HTTP 200 |
| Silk | <https://weavesilk.com/> | HTTP 200 |
| Sandspiel | <https://sandspiel.club/> | HTTP 200 |
| Thisissand | <https://thisissand.com/> | HTTP 200 |
| Cameron's World | <https://www.cameronsworld.net/> | HTTP 200 |

有意排除的候选：Fourmilab（本次 HTTP 502）、TEXTFILES.COM（本次 HTTP 503）、Neal.fun（Cloudflare 403）。这些响应只说明本次检查未通过，不认定网站永久失效。Poolsuite、Marginalia Search、Radiooooo 与 NASA APOD 使用了本次观察到的最终地址。

## 历史依据

| 年份 | 条目 | 本次确认的依据与语义 |
| --- | --- | --- |
| 1999 | HTTP/1.1 / RFC 2616 | RFC 正文标注 June 1999；未补造具体日。该 RFC 已被后续文档替代，此处用作历史阅读。 |
| 1999 | Apache 基金会 | ASF History 记载基金会于 1999 年 6 月成立；未补造具体日。 |
| 1999 | Debian 2.1 | Debian Chronicles 原公告写明 1999-03-09 发布。原 www.debian.org 旧路径会转向年度索引，故使用已核实的 Chronicles 具体文章。 |
| 1999 | HTML 4.01 | W3C 保留版本首页标注 24 December 1999。作为可阅读的当年文档入口，不伪装为 Wayback 快照。 |
| 1999 | APOD | NASA 文章标题及页面元数据保留 1999-10-02；页面已迁移到今天的 NASA Science 布局，介绍中明确说明。 |
| 2007 | iPhone | Apple 原始新闻稿标题／正文标注 January 9, 2007。 |
| 2007 | Android | Open Handset Alliance 原公告标注 November 5, 2007，宣布 Android 平台。 |
| 2007 | Atom 发布协议 | RFC 5023 正文标注 October 2007。作为当年技术文档入口。 |
| 2007 | Scratch | Scratch Foundation 首页写明 2007 年在 MIT Media Lab 开发。跳转为今天的项目介绍，不是 2007 年截图。 |
| 2007 | OpenStreetMap | 项目 Wiki 历史页记载 2007 年 Potlatch 上线及首届 State of the Map。卡片打开今天的项目入口。 |
| 2012 | Higgs | CERN 说明写明 2012-07-04 宣布发现新粒子；描述区分当时发现与后续确认。 |
| 2012 | IPv6 | Internet Society 的 World IPv6 Launch 页面写明 2012-06-06 长期启用计划。 |
| 2012 | Curiosity | NASA 任务页列出着陆日 Aug. 6, 2012。 |
| 2012 | Raspberry Pi | 官方启动文章在页面上标为 2012-03-01；卡片只使用年份关联，不把文章日期断言为首次发售日。 |
| 2012 | HTML5 | W3C 保留版本首页标注 Candidate Recommendation 17 December 2012；不称为最终推荐标准。 |

各条记录的 `evidenceUrls` 存放实际依据，具体链接可在 `data/history.json` 检查。

## 三个精确快照

| 站点 | 捕获时间（UTC） | 已检查的实际地址 |
| --- | --- | --- |
| Yahoo!：目录里的互联网 | 1999-10-10T04:00:12Z | <https://web.archive.org/web/19991010040012/http://www9.yahoo.com:80/> |
| Twitter：What are you doing? | 2007-10-03T07:37:24Z | <https://web.archive.org/web/20071003073724/http://twitter.com:80/> |
| Mozilla：开放网络的首页 | 2012-03-29T11:01:24Z | <https://web.archive.org/web/20120329110124/http://www.mozilla.org/> |

快照地址由 Internet Archive API 提供，时间从其 `timestamp` 字段逐位转换为 UTC ISO 字符串；并在返回的 Wayback HTML 中再次核对。Yahoo 的快照原网址是 `www9.yahoo.com:80`，Twitter 为 `twitter.com:80`，均保留实际原网址，没有改写成查询时的别名。Mozilla 候选查询是 2012-10-02，但实际返回并展示的是 **2012-03-29**，没有把查询日期冒充捕获日期。

2012 年 Wikipedia、GitHub、YouTube 的初始候选查询未返回可用快照，因此没有添加这些候选。

## 后续人工体验检查

- 在常见桌面与手机浏览器中打开抽样外站，检查声音与手势交互；部分站点有订阅或登录功能，不应由漫游器承诺全部免费。
- 在浏览器中抽查 3 个 Wayback 页面的主内容，确认失效图片和跨年子链接不会影响用户理解；仍保留原网址与下一站的退出路径。
- 每次内容更新时重查改动项；遇到确定失效的条目先禁用，再寻找替代，不自动把一次 403 当成永久失效。
