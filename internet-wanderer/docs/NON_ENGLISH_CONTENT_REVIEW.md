# 非英语内容核验记录

本轮核验日期为 **2026-10-06（Asia/Shanghai）**，新增 6 个 Elsewhere 网站。网站池由 30 个扩展为 36 个；历史与新闻样本没有扩大。

## 收录标准与范围

- 从官方入口读取可识别的导航或内容，抽查代表性页面；记录最终网址，避免继续收录已迁移的旧域名。
- 根据所收录入口的实际文字标注语言，不根据机构所在地猜测语言。中文 3 个（含繁体中文）、日语 2 个、西班牙语 1 个；中英双语或可切换英语的页面在下文注明。
- `publisherCountry` 记录发布机构所在地，不代表所有作品、地图或文章的发生地。`checkedAt` 记录本轮核验日期，不表示持续监测。
- 只保留原站链接和自写中文介绍，全部采用 `displayPolicy: link-only`。没有复制图片、正文、音视频或替网站推断统一许可证。
- 这是官方入口及抽样页面审核，不是整站内容事实审查、全量交互测试或长期可用性保证。文字读取成功不等于所有浏览器功能可用；本地自动测试也不访问外站。

## 收录清单与证据

| 稳定来源 ID | 正式入口 | 入口语言 | 发布机构所在地 |
| --- | --- | --- | --- |
| `digital-dunhuang` | [数字敦煌](https://www.e-dunhuang.com/) | `zh`，中英双语门户，资源库可切换语言 | 敦煌研究院，中国甘肃 |
| `npm-digital-archive` | [故宮典藏資料檢索](https://digitalarchive.npm.gov.tw/opendata) | `zh-Hant`，繁体中文为主，部分英文品名 | 国立故宫博物院，中国台湾台北 |
| `cas-kepu` | [中国科普博览](https://www.kepu.net.cn/) | `zh`，中文 | 中国科学院计算机网络信息中心，中国北京 |
| `bunka-online` | [文化遺産オンライン](https://online.bunka.go.jp/) | `ja`，日语，可选英语 | 日本文化厅，日本京都 |
| `gsi-maps` | [地理院地図](https://maps.gsi.go.jp/) | `ja`，日语地图界面 | 日本国土地理院，日本茨城县筑波市 |
| `reina-sofia` | [Museo Reina Sofía · Colecciones](https://www.museoreinasofia.es/colecciones/) | `es`，西班牙语，可选英语 | 索菲亚王后国家艺术中心博物馆，西班牙马德里 |

### 数字敦煌

公开门户显示中文栏目及英文副标题。[资源库首页](https://www.e-dunhuang.com/index.htm)可读，页脚确认敦煌研究院；[官方搜索页面](https://search.e-dunhuang.com/search.htm?q=%E6%95%A6%E7%85%8C)可读取中文洞窟解说及语言选项。本轮资源库文字读取默认呈现英语，因此卡片明确说明可以切换语言。

第 257 窟解说可公开读取，但壁画分区出现登录提示。卡片注明部分细节可能需要登录；未验证全景渲染、所有高清图像、语言切换操作或下载条件。

### 故宮典藏資料檢索

旧 `theme.npm.edu.tw/opendata/` 转至现行 `digitalarchive.npm.gov.tw/opendata`，收录最终入口。公开目录显示繁体中文、朝代与器物分类；[“臨池真賞”墨详情](https://digitalarchive.npm.gov.tw/opendata/Pub/Detail/2383?dep=U&mode=full)可读，抽样未遇登录拦截。机构和北院地址见目录页脚。

未实际操作筛选、IIIF 查看器或图片下载。入口区分不同分辨率图像与文字的使用条件，本轮仅链接原站，不把局部授权推广为整站许可证。

### 中国科普博览

主页与[珠峰测高科普页面](https://www.kepu.net.cn/kpzg_kpjd/all/2026nofl/202609/t20260908_856245.html)可公开读取中文内容；抽查标题、署名与文章入口。[中科院机构介绍](https://cnic.cas.cn/kxyj/xxhyy_1/202106/t20210629_6118614.html)确认运营方，[现行联系方式](https://cnic.cas.cn/lxwm/)确认北京地址。

未验证视频播放。部分旧虚拟博物馆和 VR 子页读取失败，旧健康竞猜也有过时措辞；卡片链接当前主页，不承诺旧馆、VR 或所有站外内容可用，不把科普门户作为医疗指南。

### 文化遺産オンライン

旧 `bunka.nii.ac.jp` 已迁移至 `online.bunka.go.jp`；[官方首页](https://online.bunka.go.jp/)保留域名迁移公告、日语导航、机构运营说明与京都地址。[富岳三十六景抽样条目](https://online.bunka.go.jp/heritages/detail/444165)可公开读取作者、年代与所藏馆。

[关于与链接规定](https://online.bunka.go.jp/about)说明链接与资料权利边界。未全面验证高清图像与视频；首页核验时仍提示部分 Mac/iOS 环境的高清图像颜色问题。卡片仅承诺目录浏览，不承诺每个设备的高清功能。

### 地理院地図

在浏览器中加载实际地图界面，看到日语搜索、地图选择、工具、缩放及标高控件，未要求登录。[官方功能介绍](https://maps.gsi.go.jp/help/intro/index.html)说明地图与照片能力；[链接条款](https://maps.gsi.go.jp/help/termsofuse.html)和[机构地址及内容条款](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)确认发布方与使用边界。

需要 JavaScript。缩放操作后的状态读取超时，不能据此宣称缩放测试通过，也不能推断缩放不可用；3D、历史照片及其他图层未全面测试。卡片只介绍地图、地形和标高，注明 JavaScript 条件。

### Museo Reina Sofía

旧 `/coleccion` 转至 `/colecciones/`，收录最终入口。馆藏目录和 [Tertulia 作品页](https://www.museoreinasofia.es/colecciones/obra/tertulia/)可公开读取西班牙语标题、作者、年代、材料等，抽样未遇登录拦截。馆藏页及[官方声明](https://www.museoreinasofia.es/aviso-legal/)确认马德里地址。

未全面验证“显示更多”、视频或研究项目的互动。[官方声明](https://www.museoreinasofia.es/aviso-legal/)区分馆方内容与艺术作品图片权利；本轮不转载原文或作品图像。

## 暂未收录的候选

北京故宫数字收藏、中国数字科技馆在本轮官方入口读取时失败或超时；Prado 和 BNE 的候选页面返回 403。本轮不启用这些候选，读取失败也不等于网站永久失效。以后重新核验成功后再决定是否收录。

## 项目内验证

数据校验检查稳定 ID、语言字段、来源引用与合法网址。生产构建浏览器回归逐条检查新增卡片的标题、标题 `lang`、介绍、语言显示名、原网址，以及收藏后刷新恢复和保存快照。所有截图与测试临时输出保存在项目内；外站审核与本地功能回归分别记录，不互相代替。

2026-10-06 本地验收结果：

| 检查 | 结果 |
| --- | --- |
| 数据校验与生产构建 | 通过；36 网站、18 历史条目、32 新闻、52 来源、3 年份 |
| 离线逻辑测试 | 55 / 55 通过 |
| Windows Edge 浏览器回归 | 37 / 37 通过，包括 6 个新增网站与收藏恢复 |
| 临时目录监听修正 | `.launcher/` 排除后相关 Vite 提供层场景另复测 2 / 2 通过，无文件锁报错；生产构建再次通过 |
| 固定一键启动入口 | 启动当前源码、重复启动复用、依赖指纹变化自动重启及结束清理均通过 |
| Git 差异检查 | 通过 |

浏览器与启动测试在沙箱外的本机环境通过。沙箱内最初分别出现 Edge 连接退出和 localhost `EACCES`，未通过的环境尝试没有算作成功。启动回归使用真实 `一键启动.cmd --no-browser`，验证服务生命周期；本轮未另测默认浏览器自动打开。没有关闭安全软件或恢复 PowerShell 启动脚本。
