# 多语言新闻档案：接口核验与采集边界

核验日期：**2026-10-06**。本轮选择 Global Voices 官方历史 RSS，继续使用已有 RSS adapter；保留 NASA 与 ECB 作为独立机构资讯来源。配置共 7 个 news 来源，Global Voices 覆盖英语、简体中文、日语、法语与西班牙语。这里记录真实接口响应与项目的采集约定，不以核验样本推算本轮实际导入数量。

## 为什么选择历史 RSS

[Global Voices 官方 RSS 索引](https://globalvoices.org/feeds/)公布根 feed 并介绍聚合／嵌入方式；实际请求进一步确认了年度 `/YYYY/feed/?paged=N` 与月度 `/YYYY/MM/feed/?paged=N` 路由可返回早期文章。接口不需要 API key，不限于近几年。本项目采用年档案，逐年分页扩库，而不是手写几条新闻。

WordPress REST posts 也已取到真实 HTTP 200 JSON，支持 `after`、`before`、`orderby=date`、`order`、`per_page`、`page` 与 `X-WP-Total`／`X-WP-TotalPages`。但它的 `author` 是数字 ID，实际 `_embed=author` 返回 `rest_cannot_access`、401，不能获得可公开使用的原作者姓名。RSS 本身已有结构化署名 footer，故这轮不额外实现 REST adapter，也不为补署名逐篇抓取文章 HTML。

官方通用协议资料：[WordPress Posts REST 文档](https://developer.wordpress.org/rest-api/reference/posts/)、[分页文档](https://developer.wordpress.org/rest-api/using-the-rest-api/pagination/)、[WordPress Feeds](https://developer.wordpress.org/advanced-administration/wordpress/feeds/)。这些通用文档不能替代 Global Voices 的实际可达性核验，也不是 Global Voices 对档案完整度、稳定性或请求额度的承诺。

## 实际 RSS 响应样本

以下时间均为 RSS `pubDate` 的 UTC 时刻，表示该链接所指语言版本的发表时间。请求均获得 HTTP 200、可解析 RSS；只摘取标题、链接、时间与署名作接口证据，未将正文和图片存入项目。

| 语言 | 已核验入口 | 实际样本与发表时间 | RSS 署名 footer |
| --- | --- | --- | --- |
| `en` | [2005 年第 1 页](https://globalvoices.org/2005/feed/?paged=1) | [Cambodian Human Rights Leader Kem Sokha Arrested On New Year's Eve](https://globalvoices.org/2005/12/31/cambodian-human-rights-leader-kem-sokha-arrested/) · `2005-12-31T22:25:28Z` | 原作者 Beth Kanter。 |
| `zh-CN` | [2010 年 12 月](https://zhs.globalvoices.org/2010/12/feed/) | [叙利亚：下雪吧！](https://zhs.globalvoices.org/2010/12/31/7125/) · `2010-12-31T00:00:18Z` | 原作者 Jillian C. York；译者 Alish。原文证据链接指向英语版本。 |
| `ja` | [2010 年 12 月](https://jp.globalvoices.org/2010/12/feed/) | [シリア:雪よ降れ！](https://jp.globalvoices.org/2010/12/30/3183/) · `2010-12-30T04:49:21Z` | 原作者 Jillian C. York；译者 Hiroyoshi Matsuzaki。 |
| `fr` | [2010 年第 1 页](https://fr.globalvoices.org/2010/feed/?paged=1) | [Le Kazakhstan, hôte du Sommet de l'OSCE](https://fr.globalvoices.org/2010/12/31/52265/) · `2010-12-31T16:03:08Z` | 原作者 Adil Nurmakov；译者 Suzanne Lehn。`dc:creator` 单独给出的是译者。 |
| `es` | [2010 年 12 月](https://es.globalvoices.org/2010/12/feed/) | [Nepal: Depende de los políticos](https://es.globalvoices.org/2010/12/31/nepal-depende-de-los-politicos/) · `2010-12-31T20:00:28Z` | 原作者 Rezwan；译者 Gabriela García Calderón Orbe。 |

补充的中文／日语 2015 年核验中，以下实际 UTC 时间和署名来自 feed：

- [简中记录 13946](https://zhs.globalvoices.org/2015/01/30/13946/)：`2015-01-30T15:55:02Z`；葡萄牙语原作者 Taisa Sganzerla，中间英语译者同名，目标简中译者 Ameli。不能因同一署名多次出现就混淆作者与译者角色。
- [简中记录 13942](https://zhs.globalvoices.org/2015/01/25/13942/)：`2015-01-24T16:11:14Z`；原作者 Rezwan，译者 GV 中文化小组。URL 路径为 1 月 25 日，不能覆盖 RSS 的实际 UTC 时间。
- [日语记录 34231](https://jp.globalvoices.org/2015/01/31/34231/)：`2015-01-31T09:18:12Z`；原作者 Amira Al Hussaini，译者 Yuko Aoyagi。
- [日语记录 32810](https://jp.globalvoices.org/2015/01/27/32810/)：`2015-01-27T15:08:03Z`；原作者 Rezwan，译者 Yoshiki Oda。

英语根 [feed](https://globalvoices.org/feed/)也包含署名 footer；本轮样本的一个作者 section 内有 Guest Contributor 与 Zahiris Priscila Francisco Martínez 两个 `user-link`，不能只保留第一个作者。

英语不是一律原作：英语 [2010 年第 1 页](https://globalvoices.org/2010/feed/?paged=1)中的 [Tunisia : “We Are Not Afraid Anymore!”](https://globalvoices.org/2010/12/31/tunisia-we-are-not-afraid-anymore/)发表于 `2010-12-31T16:18:47Z`，footer 标明原作者 Claire Ulrich、原语言法语、英语译者 Lova Rakotomalala。对应法语 [原作](https://fr.globalvoices.org/2010/12/31/52154/)在 RSS 中发表于 `2010-12-31T14:02:16Z`，原作标签为 `Ecrit par`。

## 年档案、分页与可用范围

本轮分别核验过以下年度第 1 页或分页对：

| 年份／语言 | 已取得的结果 |
| --- | --- |
| 英语 2005、2010、2015、2020、2025 | 每年第 1 页均 HTTP 200，各 15 条 RSS item。2005 年第 2 页也为 200，首条从第 1 页的 12 月 31 日推进到 12 月 30 日，证明分页发生变化。 |
| 简体中文 2005、2015 | 2005 年第 1 页 HTTP 200，10 条；首条发表于 `2005-12-31T23:25:22Z`。2015 年第 1、2 页均 200，每页 10 条、不重复。2010 年 12 月另有 10 条真实响应。 |
| 法语 2010 | 年度第 1、2 页均 HTTP 200，各 10 条，首条分别为 12 月 31 日与 12 月 30 日；月档案第 2 页也返回不同条目。 |
| 西班牙语 2005、2015 | 2005 年第 1 页 HTTP 200，10 条；2015 年第 1、2 页均 HTTP 200，各 10 条。2010 年 12 月的第 1、2 页也均 200。 |
| 日语 2015、2025 | 2015 年第 1、2 页均 200，每页 10 条、不重复。2025 年第 1、2 页均 200，各 10 条，首条分别发表于 12 月 15 日与 9 月 20 日；2010 年 12 月另有 10 条真实响应。 |

上述接口核验阶段没有逐页收齐年度；之后的有界回填结果另见文末。英语 REST 取到 2004 年记录，不等于每个语言都从 2004 年起有文章。

失败、格式问题与空档必须保留区别：

- 简中／日语 `/feed/?year=2015&monthnum=1` 的查询条件实际被忽略，返回最新条目，不能用它回填历史。采用已核验的年度路径，并检查返回条目的可靠发表时间是否属于请求年份。
- 日语 feed 的语言字段出现 `en-US`，与实际日语内容不符；条目语言使用已核验的来源配置 `ja`，不照搬这个错误字段。
- 日语 2015 年 1 月第 1 页含 XML 不允许的 ESC 控制字符 `0x1B`。归一化前清除 XML 非法控制字符，不改写标题、日期或署名语义；清理后仍无法解析应记录失败。
- 简体中文 `/2020/feed/?paged=1` 的一次请求为 HTTP 200，但没有 RSS item；第 2 页为 404。只能记录本次入口结果，不能据此宣布该语言没有任何 2020 年报道。
- 随后的部分年度矩阵请求出现 HTTP 502 或 20 秒请求超时，包含此前成功的日语 2025 年入口。这些是失败，不是成功空结果，也不能证明档案永久失效。
- 年度 404／合法无条目可以作为该次入口没有可取数据处理；5xx、超时、无效 XML 不得覆盖上一次成功条目或成功时间。
- 研究请求使用 PowerShell `Invoke-WebRequest` 的现有网络配置，未关闭 TLS 校验。项目的 Node.js 采集在当前本机需要命令环境中的既有代理；这不是通用机器要求，也不能把代理地址硬编码。

## 署名、许可证与发布者位置

[官方介绍](https://globalvoices.org/about/)说明 Global Voices 是国际多语言作者与翻译社区，法人 Stichting Global Voices 注册于荷兰，地址在海牙。中文、日语、法语与西班牙语子站均应记录为该网络的语言版本；域名和语言不等于作者国籍、报道地点或出版社所在国家。

[Republishing Guidelines](https://globalvoices.org/about/global-voices-attribution-policy/)要求保留 Global Voices 原文章链接与作者姓名，链接许可证并说明是否改动；第三方图片、视频和音频的权利另行确认。官网页脚指向 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)。本项目保留 `author`、已确认的 `translator`、`licenseUrl` 和 `evidenceUrls` 中的原文链接，只展示标题与元数据，不转载正文、摘要、图片或音视频，不声称第三方媒体素材也属于同一许可证。

RSS `dc:creator` 与 REST 数字 `author` 不足以确认原作者。真实 footer 的结构为 `gv-rss-footer` → `text-credits-container` → 一个或多个 `text-credits-section`，section 内的 `credit-label` 表示角色，全部 `user-link` 表示该角色的署名；可选 `source-link` 给出原语言文章链接。

| 实际标签 | 含义 |
| --- | --- |
| `Written by`、`Written (Français) by`、`Written (English) by` | 原作者；括号指出原语言。 |
| `Ecrit par` | 法语原作的原作者。 |
| `Escrito (English) por` | 西语版所指原作的原作者。 |
| `記者 (English)` | 日语版所指原作的原作者。 |
| `Translated (English) by`、`Translated (简体中文) by` | 指定语言版本的译者。 |
| `Traduit (Français) par`、`Traducido (Español) por`、`翻訳 (日本語)` | 法语、西语、日语版本的译者。 |

英语原作样本的署名片段原样为：

```html
<div class='text-credits-section'><span class='credit-label'>Written by</span> <a href='https://globalvoices.org/author/beth-kanter/' class='user-link'>Beth Kanter</a></div>
```

法语样本的署名片段原样为：

```html
<div class='text-credits-section'><span class='credit-label'>Written (English) by</span> <a href='https://globalvoices.org/author/adam-kesher/' class='user-link'>Adil Nurmakov</a></div><div class='text-credits-section'><span class='credit-label'>Traduit (Français) par</span> <a href='https://fr.globalvoices.org/author/suzanne-lehn/' class='user-link'>Suzanne Lehn</a></div>
```

西语样本的署名片段原样为：

```html
<div class='text-credits-section'><span class='credit-label'>Escrito (English) por</span> <a href='https://globalvoices.org/author/rezwan/' class='user-link'>Rezwan</a></div><div class='text-credits-section'><span class='credit-label'>Traducido (Español) por</span> <a href='https://es.globalvoices.org/author/gabriela-garcia-calderon-orbe/' class='user-link'>Gabriela García Calderón Orbe</a></div>
```

解析应限于 footer，先按 section 分角色，再提取其全部署名，解码实体并输出纯文本。多级翻译需要保留被实际标出的中间与目标译者，不能按位置猜作者。遇到缺失或无法识别的署名，不推测作者角色，不把译者当成原作者，也不根据文章 URL 编造原作者；无法满足已核验署名要求的记录不进入本轮展示池。

旧档案的原文证据链接可能仍使用 `globalvoicesonline.org`。保留实际给出的原文证据，不擅自把旧链接的日期当成已验证的原作发表时间；本轮没有逐一验证所有旧域跳转和正文里的外部链接。当前语言文章的可靠 `pubDate` 与原语言版本日期是两个事实。

## REST 核验记录

以下不是本轮运行时依赖，只用于保存接口决策依据：

- 英语 `https://globalvoices.org/wp-json/wp/v2/posts?per_page=2&after=2004-01-01T00%3A00%3A00&before=2006-01-01T00%3A00%3A00&orderby=date&order=asc&_fields=id,date,date_gmt,modified,link,title,author` 返回 HTTP 200。首条 `id=4`，标题 `Dec. 11 workshop schedule`，`date=2004-10-26T22:03:23`，`date_gmt=2004-10-27T02:03:23`。这是早期机构活动记录，不能由此断言每条 REST post 都是新闻报道。
- 法语 `https://fr.globalvoices.org/wp-json/wp/v2/posts?per_page=2&before=2011-01-01T00%3A00%3A00&orderby=date&order=desc&_fields=id,date,date_gmt,link,title,author` 返回 HTTP 200，`X-WP-Total=5858`，`X-WP-TotalPages=2929`。相同查询加 `page=2` 返回不同的 2010 年记录。上述总数只适用当时查询，不是全站永久规模。
- 西语 `https://es.globalvoices.org/wp-json/wp/v2/posts/449452?_embed=author` 返回 HTTP 200 JSON，但 `_embedded.author` 内部是 401 错误。该记录 `date=2010-12-31T20:00:28`，`modified=2024-12-31T20:57:29`，展示了发表与修订时间不能混用。简中 REST 的作者嵌入也未取得可靠原作者署名。
- WordPress 定义 `date` 为站点时区的发表时间、`date_gmt` 为 GMT 发表时间。若以后接入 REST，要明确转换 GMT 字段，不在无时区的 `date` 后面任意加 `Z`；保留真实发表时间，不替换成导入时间。

## 本轮接入与验收约定

```sh
npm run data:backfill -- --from=2004 --to=2026 --pages=2
```

默认年份从 2004 年到执行当年，最多 10 页／年，每次 feed 最多接受 15 条；配置和采集白名单均复用 `config/rss-sources.json`。本轮按每年最多 2 页实际取数，这是有明确上限的档案抽样，不声称完整。运行结果记录实际尝试／成功时间、空结果、失败及导入数量；未来重跑按稳定 ID／URL 合并，普通根 feed 刷新不删除已导入档案。

取消新闻年龄的进入硬门槛，48 小时更新状态只提示；历史新闻可出现在 News Drift 和 Surprise Me，不自动成为 Time Machine。停用来源的配置墓碑与历史记录保留作溯源，但该来源退出漫游池。失败保留历史，合法空 feed 也不删除历史。

单源补采可使用 `--source=global-voices-fr`。年度路由按站点当地日历归档，UTC 时间可能跨年：英文 [Bombs in Bangkok](https://globalvoices.org/2006/12/31/boms-in-bangkok/)在 `/2006/feed/?paged=1` 返回，发表时刻为 `2007-01-01T03:04:02Z`。校验接受年度 UTC 边界前后 14 小时的时区偏移，保留可靠发表时间；不根据 URL 重写日期，也不允许其它年份年中的响应混入。

## 实际导入结果 — 2026-10-07

快照生成于 **2026-10-07T00:48:55.792Z**（北京时间 08:48:55）。五个 Global Voices 语言接口均尝试 2004～2026 年，每年最多 2 页；先前英文／简中 2004 年超时和英文 2006 年跨时区拒绝已分别补采／修正。法语原作署名标签修正后，也重采同一有界范围。最后根 feed 刷新七源均为 `ok`。

| 来源 | 条数 | 当前库实际最早／最晚发表日期（UTC） |
| --- | ---: | --- |
| Global Voices · 英语 | 689 | 2004-10-27 ～ 2026-10-06 |
| Global Voices · 简体中文 | 284 | 2006-11-27 ～ 2024-10-03 |
| Global Voices · 日语 | 393 | 2007-12-25 ～ 2026-10-03 |
| Global Voices · 法语 | 400 | 2007-11-04 ～ 2026-09-28 |
| Global Voices · 西班牙语 | 442 | 2004-10-27 ～ 2026-10-06 |
| NASA · 英语 | 20 | 保留既有记录，并合并本次根 feed |
| European Central Bank · 英语 | 15 | 保留既有记录，并合并本次根 feed |

共 **2,243 条**，其中英语含两个机构源共 724 条；其余语言合计 1,519 条。1,536 条记录有明确译者字段，所有 Global Voices 记录保留原作者及 CC BY 3.0。原来 32 条新闻的 ID 全部保留，规范化 URL 与稳定 ID 去重已由数据校验及离线测试覆盖。

范围是有界档案抽样，未取每年的所有页。简中当前返回并通过日期／署名筛选的年度为 2006～2019 年及 2024 年；缺少的年份不补造记录，也不据此断言该站没有对应报道。最早英文记录包含机构活动发布；语言版本会包含翻译与原作，不把五个语言接口声称为五家独立媒体。未逐条检查全部旧正文、图片、外站及原语言链接的持续可用性。

本地数据校验、TypeScript 与生产构建通过；77 项离线逻辑测试、43 项实际浏览器测试通过。浏览器验证五种语言历史新闻的原日期、作者／译者、许可、链接、收藏刷新恢复及 320px／390px 布局，并确认旧新闻仍以新闻呈现。截图由对应测试写入项目内 `test-results/`。扩大快照后生产 JS 为 1,561.25 kB（gzip 420.28 kB），构建有超过 500 kB 的体积提示；当前仍采用静态打包，不把它描述为轻量数据库或完整全文库。

实际 `一键启动.cmd` 回归通过：运行当前源码、重复启动复用、依赖指纹变化后准备依赖并重启均正常；测试退出后 `127.0.0.1:5173` 已确认释放。该回归使用 `--no-browser`，没有重复触发用户默认浏览器。缓存、临时文件和测试日志保存在项目内 `.launcher/`。
