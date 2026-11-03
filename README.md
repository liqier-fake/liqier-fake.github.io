# liqier-fake

一个以滚动推进镜头的 3D 个人网站：银龙始终陪伴，文章、感悟、照片和收藏都作为月夜世界里的真实地点出现，而不是菜单卡片。

## 本地运行

需要 Node.js 24 与 Corepack。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

完整检查：

```bash
pnpm test
pnpm test:e2e
pnpm check
pnpm build
```

## 添加自己的内容

- 感悟：在 `src/content/thoughts/` 新建 Markdown。
- 文章：在 `src/content/articles/` 新建 Markdown。
- 自己拍的照片：图片放到 `public/images/`，在 `src/content/photography/` 新建 Markdown，并填写 `image` 与 `alt`。
- 收集的图片：在 `src/content/collection/` 新建 Markdown；必须填写 `creator`、`sourceUrl` 和 `rightsNote`，只使用自己拥有或获准使用的图片。

现有四篇内容都是占位示例，可以直接替换。站点没有后台，推送 Markdown 和媒体文件后由 GitHub Actions 重新生成。

## 发布到 GitHub Pages

1. 在 GitHub 新建名为 `liqier-fake` 的仓库并推送本项目。
2. 打开仓库 `Settings → Pages`，把 Source 设为 **GitHub Actions**。
3. 推送到 `main`；`.github/workflows/deploy-pages.yml` 会自动检测仓库名并以 `/liqier-fake/` 为基础路径构建。
4. 发布地址通常是 `https://你的用户名.github.io/liqier-fake/`。如果仓库本身叫 `你的用户名.github.io`，工作流会自动改用根路径 `/`。

GitHub Free 账户使用公开仓库即可。GitHub Pro、Team 或 Enterprise 可从私有仓库发布 Pages，但生成的网站通常仍是公开的；不要把秘密写进源文件。若你的套餐不支持私有仓库 Pages，可将源码保留在私有仓库，再把 `dist/` 同步到单独的公开发布仓库。

GitHub 官方当前要求 Pages 工作流上传静态 artifact，并授予 `pages: write` 与 `id-token: write`；本项目的工作流已包含这些配置。

## 环境变量

- `PUBLIC_SITE_URL`：站点源地址，例如 `https://username.github.io`。
- `PUBLIC_BASE_PATH`：项目路径，例如 `/liqier-fake`；本地默认为 `/`。

## 素材规则

`public/images/world-poster.webp` 是为本项目生成的原创占位图。声音默认关闭；任何新增图片、字体、模型或音频都应在相邻 README 或内容 frontmatter 中记录来源与许可。
