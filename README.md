# Internet Wanderer

一个可以随手出发的互联网漫游器：探索陌生网站、不同语言的新闻，以及过去留下的网页。

当前版本为 **0.9.0**，包含 48 个精选网站、42 条历史切片（七个年份），以及 2,243 条涵盖五种语言、2004～2026 年的新闻记录。默认读取已保存的本地内容，无需账号或 API key。

首页用 Take me somewhere 大按钮直接出发，六个真实网站样本展示下一站的可能。Elsewhere 将当前网站放进网络中心；News Drift 以可拖动、缩放和点选的三维地球探索 18 个地区的报道，随机漂流飞向下一地区，新闻浮在地球之上；Time Machine 以网页主展品、事件票签和去处海报组成不同年代的展厅。收藏、返回、历史依据与永久一键启动继续保留，网站和旧网页预览明确标注为原创示意，地球采用本地 NASA 影像。

## Windows 一键启动

安装 Node.js 22.12 或以上版本（推荐 Node.js 24），双击仓库根目录的 **`一键启动.cmd`**。首次启动会准备依赖并打开 `http://127.0.0.1:5173/`；以后始终使用这个入口。首次安装或更新依赖需要联网。

应用源码位于 `internet-wanderer/`，在该目录运行 npm 命令。迁移时保留整个仓库，包含外层启动器与开发约定；本机收藏可在界面中导出 JSON 备份。

## 开发与来源记录

- [News Drift 三维地球交互、数据和验收](internet-wanderer/docs/EARTH_NEWS_EXPLORER.md)

- [完整运行、开发与维护说明](internet-wanderer/README.md)
- [新版界面、桌面 / 手机截图与验收](internet-wanderer/docs/CONTENT_FIRST_REDESIGN.md)
- [多语言新闻档案与导入验收](internet-wanderer/docs/MULTILINGUAL_NEWS_ARCHIVES.md)
- [趣味网站、历史依据与精确快照](internet-wanderer/docs/PLAYFUL_SITES_AND_YEARS_REVIEW.md)
- [路线图](internet-wanderer/ROADMAP.md)
- [版本记录](internet-wanderer/CHANGELOG.md)
- [开发范围与永久启动约定](AGENTS.md)

新闻仅索引标题、原文链接、真实发表时间与必要署名，不转载全文或图片。历史数据采用有界分页抽样，不代表完整档案。

此仓库用于保存源码与新闻快照。现有 Pages 工作流保留在应用子目录中，尚未启用 GitHub 自动部署。
