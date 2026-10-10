# 趣味网站与年份增补核验

本轮核验于 **2026-10-10**，对应 **0.5.0**。新增 12 个 Elsewhere 网站、1996／2001／2004／2016 四个年份及 24 条历史内容。当前共 48 个网站、42 条历史切片、7 个年份；原有 2,243 条新闻及其日期、署名和 ID 保留。

## 趣味网站的选择与实际检查

候选来自 [The Useless Web 的官方入口名单](https://theuselessweb.com/js/uselessweb.js)，并参考创作者的 [站点故事库](https://github.com/tholman/useless-web-archive)。选择物理、几何、声音、滚动、极简艺术和小游戏，避免重复已有的 Pointer Pointer、Zoomquilt 等条目。介绍由本项目用中文重新撰写。

以下 12 个入口均返回 HTTP 200，并在 Windows Edge 浏览器中加载、尝试基本操作。此表记录实际观察，不代表完成整个游戏、真人试听、移动设备或所有地区的验收。

| 网站 | 基本操作与观察 | 语言／限制 |
| --- | --- | --- |
| [Cat Bounce](https://cat-bounce.com/) | 点击 Make It Rain 后出现更多落下的猫；画布正常显示。 | 英语；动画与声音元素。 |
| [Koalas to the Max](https://www.koalastothemax.com/) | 鼠标从圆外穿过边缘，圆点由 1 个分裂为 4 个。 | 英语；核验基本分裂，未完成整张揭图。 |
| [Mondrian And Me](https://mondrianandme.com/) | 点击画布后生成新的几何分区与颜色。 | 英语；生成结果每次不同。 |
| [The Long Doge Challenge](https://longdogechallenge.com/) | 向下滚动约 3,000px，wow 计数由 4 增至 11。 | 英语；没有固定终点。 |
| [Binary Piano](https://binarypiano.com/) | 点击播放后二进制计数推进，按钮进入暂停状态。 | 英语；音频需点击解锁，未验证扬声器输出。 |
| [drawing.garden](https://drawing.garden/) | 点击并移动鼠标后，轨迹出现植物与动物表情符号。 | 英语操作提示；声音需点击开启，未真人试听。 |
| [One Square Minesweeper](https://onesquareminesweeper.com/) | 点击唯一的格子后，笑脸变成游戏结束状态。 | 英语；极简扫雷玩笑。 |
| [Checkbox Race](https://checkboxrace.com/) | 勾选第一格后显示 001/100，计时器启动。 | 英语；未完成全部 100 格。 |
| [Paper Toilet](https://papertoilet.com/) | 拖动纸端后，纸张展开、卷纸形态改变。 | 无明显文字交互，记为 `und`。 |
| [Sliding Toys · 8 Puzzle](https://sliding.toys/mystic-square/8-puzzle/daily/) | 点击空位邻接的方块后，方块移动，Moves 变为 1。 | 英语；每日局面会变化。 |
| [Memory Toys · Monkey Challenge](https://memory.toys/monkey-challenge/easy/) | 点击数字 1 后，其余数字隐藏，继续按记忆选择。 | 英语；未完成全部关卡。 |
| [Potato or Tomato](https://potatoortomato.com/) | 点击 Tomato 后出现答案反馈与 Play Again。 | 英语；轻量判断小游戏。 |

没有要求登录、付款或下载程序才能进行上述基本操作。部分原站加载广告、分析脚本或提供分享按钮；本项目只在用户主动打开链接后访问原站，不嵌入这些脚本。动画、声音和原站后续变化由站点自身控制。

Endless Horse 在本轮 HTTPS 请求中失败，因此未收录；这不等于已确认其永久下线。没有把 The Useless Web 的完整随机名单直接导入，也没有收录未经本轮检查的入口。

## 新增年份与历史依据

每个新增年份提供 **2 个事件、2 个去处、2 份档案**。前两组可以各包含一项事件、一项去处、一份档案，且六条互不重复。之后沿用现有的近期去重与小池放宽规则，不生成虚构内容。

| 年份 | 事件：日期及第一方依据 | 去处：页面的真实性质 |
| --- | --- | --- |
| 1996 | [多莉出生，1996-07-05](https://vet.ed.ac.uk/roslin/about/history/dolly/facts/life-of-dolly)；[PNG 1.0 推荐标准，1996-10-01](https://www.w3.org/TR/REC-png-961001)。 | [Space Jam 1996](https://www.spacejam.com/1996/) 是华纳现行保留入口；[1996-03-26 天文每日一图](https://science.nasa.gov/image-article/apod-1996-march-26-what-are-comet-tails-made-of/) 是 NASA 迁移后保留原日期的图文。 |
| 2001 | [维基百科上线，2001-01-15](https://wikimediafoundation.org/wikipedia25/)；[第一代 iPod 发布，2001-10-23](https://www.apple.com/newsroom/2001/10/23Apple-Presents-iPod/)。 | [SVG 1.0](https://www.w3.org/TR/2001/REC-SVG-20010904/) 是 2001-09-04 的原始规范；[《千与千寻》](https://www.ghibli.jp/works/chihiro/) 是吉卜力现行作品页，明确记载日本上映日 2001-07-20，原文为日语。 |
| 2004 | [Firefox 1.0 发布，2004-11-09](https://blog.mozilla.org/press/2004/11/mozilla-foundation-releases-the-highly-anticipated-mozilla-firefox-1-0-web-browser/)；[Rosetta 发射，2004-03-02](https://www.esa.int/Science_Exploration/Space_Science/Rosetta_overview)。 | [CSS 2.1](https://www.w3.org/TR/2004/CR-CSS21-20040225/) 是 2004-02-25 的候选推荐版本；[《哈尔的移动城堡》](https://www.ghibli.jp/works/howl/) 是吉卜力现行作品页，记载日本上映日 2004-11-20，原文为日语。 |
| 2016 | [引力波探测结果公开宣布，2016-02-11](https://ligo.org/detections/gw150914/)；[AlphaGo 对李世石第五局及系列赛结束，2016-03-15](https://blog.google/innovation-and-ai/products/alphagos-ultimate-challenge/)。 | [Chrome Music Lab](https://musiclab.chromeexperiments.com/) 是持续维护的实验入口，其 [官方推出公告](https://blog.google/products-and-platforms/products/chrome/introducing-chrome-music-lab/) 日期为 2016-03-09；[Rosetta in numbers](https://blogs.esa.int/rosetta/2016/09/27/rosetta-in-numbers/) 是 ESA 在 2016 年任务尾声发布的手记。 |

多莉的**出生年份为 1996**，向公众公布为 1997；引力波的**信号记录发生于 2015**，公开宣布为 2016。没有把公布日期、作品上映日期、现行资料页的更新时间或档案抓取日期混作同一种时间。

上述 16 个内容入口及 Music Lab 推出公告均实际请求成功。Chrome Music Lab 另在 Edge 中确认实验入口与导航正常显示；未据此声称所有子实验与音频均已验收。所有历史记录在 `evidenceUrls` 保留依据；只有具有明确日期的事件才填写 `history.occurredOn`。

## 八份新增档案的精确记录

先请求目标日期附近的 Wayback 回放，取服务最终返回的实际捕获时间；随后逐一请求下列精确地址，核对 HTTP 200、HTML 标题和页面内 `__wm.wombat` 的原网址与 14 位时间戳。八份均与入库数据一致。查询目标日期没有写成抓取日期。

以下时间全部为 **UTC**。原网址中的 `:80` 是 HTTP 默认端口；回放链接按 URL 规范省略默认端口，保留原站身份。

| 年份／快照 | 实际捕获时间（UTC） | 档案中的原网址 | 回放核验标题 |
| --- | --- | --- | --- |
| [1996 Yahoo](https://web.archive.org/web/19961128070641/http://www8.yahoo.com/) | 1996-11-28 07:06:41 | `http://www8.yahoo.com:80/` | Yahoo! |
| [1996 Nintendo](https://web.archive.org/web/19961222145127/http://www.nintendo.com/) | 1996-12-22 14:51:27 | `http://www.nintendo.com:80/` | Nintendo Power Source |
| [2001 Google](https://web.archive.org/web/20010630220606/http://www.google.com/) | 2001-06-30 22:06:06 | `http://www.google.com:80/` | Google |
| [2001 Wikipedia](https://web.archive.org/web/20011201040400/http://www.wikipedia.com/) | 2001-12-01 04:04:00 | `http://www.wikipedia.com:80/` | Wikipedia: HomePage |
| [2004 Mozilla](https://web.archive.org/web/20041109091306/http://www.mozilla.org/) | 2004-11-09 09:13:06 | `http://www.mozilla.org:80/` | Mozilla - Home of the Firefox web browser, Thunderbird and the Mozilla Suite |
| [2004 Flickr](https://web.archive.org/web/20040701020748/http://flickr.com/) | 2004-07-01 02:07:48 | `http://flickr.com:80/` | Welcome to Flickr - Photo Sharing |
| [2016 The Useless Web](https://web.archive.org/web/20160629182844/http://www.theuselessweb.com/) | 2016-06-29 18:28:44 | `http://www.theuselessweb.com/` | The Useless Web |
| [2016 DeepMind](https://web.archive.org/web/20160707023526/https://www.deepmind.com/) | 2016-07-07 02:35:26 | `https://www.deepmind.com/` | Google DeepMind |

这是首页 HTML 的回放核验，不能保证所有图片、子链接、旧登录或插件仍可使用。Nintendo 的 Shockwave／ActiveX 时代互动、Flickr 的旧账号操作、The Useless Web 快照内的随机跳转尤其不作可用承诺；卡片已给出相应说明。

## 数据维护与应用验收

- 所有旧 ID 保留；新增网站与历史切片分别进入 Elsewhere 和 Time Machine，历史新闻继续归 News Drift。来源采用 `link-only`，只保留名称、链接、原创中文介绍和出处；没有将第三方图文素材收入发布包。
- 年份导航自动换行；核对 320／390／768／1100／1440px 下所有年份按钮与随机年份操作完整可见，触摸目标至少 44px。
- 构建时拒绝历史条目缺失依据、年份缺少事件／去处／档案，以及 Wayback 链接与精确捕获时间、原网址不一致的情况。机械校验不代替人工史实核验。
- `checkedAt` 仅代表本轮检查日期，不代表持续监测。新闻快照整理时间仍是自身的 `generatedAt`，没有因增补网站而改写。
- 临时联网核验、浏览器配置与截图放在项目内 `.launcher/`，不进入 Git；产品截图和回归输出按现有测试约定放在项目内。

本轮验证完成：数据校验、TypeScript 与生产构建通过；88 项逻辑测试、48 项浏览器测试全部通过；真实一键启动入口、当前源码服务、重复启动复用、依赖变化重启及退出后的 5173 端口释放均通过。联网核验临时使用了代理，启动回归须临时设置 `NO_PROXY=127.0.0.1,localhost,::1`，避免回环请求经代理造成测试超时；启动器文件未作修改。

生产 JS 约 1.58 MB（gzip 427 KB），构建保留超过 500 KB 的分包体积提示。浏览器回归使用实际构建文件和离线请求拦截；原站联网检查独立进行，不能将应用回归视作所有外部资源永久可用的证明。

当前产品截图：[2016 桌面年份包](previews/time-2016-desktop.png)、[1996 手机年份包](previews/time-1996-mobile.png)。
