# UI Demo 0.3.0 验收记录

日期：2026-10-04。设计见 [UI_DIRECTION.md](../UI_DIRECTION.md)，扩展方法见 [EXTENDING_THE_DEMO.md](EXTENDING_THE_DEMO.md)，本地运行见 [README.md](../README.md)。

## 本轮完成的三项开发

1. **漫游交互**：Surprise Me 每次重新出发，窗口联动悬停与按压反馈；到达提示、持续可操作的换站按钮、浏览器前进／后退恢复、整组年份包返回；手机固定操作栏与收藏同步，支持安全区域和减少动态效果。
2. **模式差异**：Elsewhere 的三种手工明信片、News Drift 的报刊刊头与长标题，以及 Time Machine 的年代字体、控件与入场节奏；历史网页归入 Time Machine。
3. **扩展结构**：配置驱动的年代注册表、统一 ContentProvider、当前静态适配器、独立仓库与时钟、取消旧加载及失败重试；视觉窗口不读取内容上下文。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| 数据、年代注册与 TypeScript、生产构建 | 通过 |
| 逻辑测试 | 55 / 55 通过 |
| 浏览器检查 | 30 / 30 通过，Chromium |
| 连续漫游 | 20 次 Elsewhere 不重复，刷新恢复当前结果 |
| 页面恢复 | 直接 hash 导航、浏览器前进／后退、整组时光卡片返回与刷新通过 |
| 键盘操作 | 换站后保留操作按钮焦点，弹层焦点循环与 Escape 通过 |
| 手机操作 | 320×640、390×844 无横向溢出，首页主动作首屏；固定栏滚动后仍可操作并同步收藏 |
| 旧功能 | 收藏备份、原数据保护、损坏／不可用存储、新闻日期与署名通过 |
| 数据提供层 | 同步失败重试、临时收藏保留、迟到结果隔离、来源规则通过 |
| 扩展年代 | 配置新增 2003 年并复用现有主题，无年份代码分支；不存在的主题被拒绝 |
| Demo 时钟 | 模拟 2099 年仍有明确标注日期的静态新闻样本；实时过期规则保持有效 |
| 项目包迁移 | 独立目录解压、重新安装依赖、构建与 55 项逻辑测试通过 |

28 项产品回归读取生产产物并拦截请求，2 项提供层集成检查使用本机 Vite 测试夹具。均不访问第三方站点。当前仍是静态 Demo，未公开部署，未新增真实 API、数据库、抓取或 Archive 自动接入。

## 最新截图

[首页](previews/home-desktop.png) · [手机首页](previews/home-mobile.png) · [Elsewhere](previews/elsewhere-desktop.png) · [手机操作栏](previews/elsewhere-mobile.png) · [News Drift](previews/news-desktop.png) · [手机 News Drift](previews/news-mobile.png)

[1999](previews/time-1999-desktop.png) · [2007](previews/time-2007-desktop.png) · [2012](previews/time-2012-desktop.png) · [手机 Time Machine](previews/time-1999-mobile.png)
