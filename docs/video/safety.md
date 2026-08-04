# Mini Sites 视频制作规程 — 环境隔离、隐私与审批

与 `workflow.md` 配套。适用于所有公开发布的 Mini Sites 视频素材。

## 录制环境

- **公开片禁止出现 dev/staging 痕迹**:`Mini-Site (Development)` / `(Staging)` 宏标签、
  lite-dev / lite-stg 租户名、内部测试页树。promo 35s 片的 Known gap(quick-insert 菜单
  显示 Development)不得在新片重现。
- 录制站点:minisites-prod org 下租户名中性的干净站点,安装 **production** 版应用
  (前置任务 P-1;站点建立与应用安装属 cloud 变更,需 Owner 逐项确认)。
- 演示 space 专建专用,页面树只含本集内容;不用任何真实客户或内部工作站点录制。

## 隐私遮罩

- 遮罩清单沿用 `promo/capture/confluence.ts` 的 `PRIVACY_CSS`:space 侧栏页树、头像、
  账户入口(aria-label 是真实邮箱)、其他厂商 app 徽标。
- selector 一律用探针从活页读取(`promo/tmp/probe-selectors.ts` 模式),不手编——手编
  selector 匹配不上时会整段素材漏遮。
- 真实姓名/头像入镜需逐例决定:真实评论保留可读作者名属既有先例(伪造 persona 更差),
  但头像必须模糊;新增例外先过 Owner。

## 秘密与凭据

- 录制账号的 API token、TOTP、cookie 不入帧;终端演示镜头先清 env 回显。
- 入镜 URL 不得携带有效 grant / 签名参数(serve-url 的 HMAC 短时签名视同凭据;镜头用
  已过期 grant 或后期打码)。
- 每个 fixture 过 bundle secret-scan 后才可用于录制;扫描输出本身可作为 S14 集的证据素材。
- 成片发布前逐帧检查高风险帧:凭据、内部 host、员工邮箱、非演示租户名。

## 内容诚实(硬规则)

- 不伪造成功帧;freeze 只能是已验证的真实结果帧。
- 不 loop、不变速、不变调;旁白与视频保持 1.0x;旁白只用本地 Kokoro(不克隆人声,不用
  外部 TTS)。
- 不模拟产品没有的能力(realtime、协作光标等);真实评论走 API 预写。
- 遮罩、裁切、标注、节奏调整允许;改变事实的后期不允许。

## 审批(三道门,缺一不可)

| 门 | 批准物 | 绑定 |
|---|---|---|
| ① 脚本审批 | canonical 脚本 + HTML preview | 内容修订号;素材实况与脚本冲突即失效重批 |
| ② Picture Lock | 960×540 Fine Cut | SHA-256 + 修订号;重渲即失效 |
| ③ 上传授权 | 1080p QC + 校验报告 + 元数据包 | 每个发布渠道单独授权(YouTube、Marketplace 媒体位、pillar 页嵌入) |

公开上传不可逆(缓存、转载、AI 索引),一律视为 externally-visible action:Owner 亲自执行,
或对具体文件哈希明示授权。校验失败、遮罩存疑、证据缺口 —— 任何一项存在时不得进入门③。
