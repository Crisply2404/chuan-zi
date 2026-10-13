# 个人网站发布范围核查

日期：2026-10-13，Asia/Shanghai。

通过 GitHub API 完整获取 Crisply2404/Crisply2404.github.io 的 main 文件列表，未发现 chuan-zi 源目录或 chuan-zi-source 构建目录。读取个人网站的完整 deploy.yml：GitHub Actions 读取私有仓库，在独立目录生成产物，将该目录下的 dist 复制到网页 dist/chuan-zi。Upload Pages artifact 仅上传 dist。workflow 没有向个人网站仓库提交项目文件的操作。

chuan-zi 私有仓库的 main 自动发布 workflow 运行类型检查、真实规则与联机测试、Pages 构建，再使用固定 commit 触发个人网站构建。公开产物检查在构建期间读取全部文件与 ZIP 内容，只允许网页资源、音频、字形数据和许可文本；TypeScript、source map、项目文档与源目录禁止进入产物。

公开网页必须提供浏览器运行所需的构建 JavaScript；项目的 React、TypeScript、服务端源码、私有配置和原始开发目录保留在私有仓库。

本次核查对象是公开仓库当前 main 文件列表、两个 workflow、产物检查脚本与本机生成的全部 dist 文件。GitHub API 的列表保存于 .research/personal-site-tree.txt。
