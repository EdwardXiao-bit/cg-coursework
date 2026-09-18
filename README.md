# 计算机图形学 课程作业仓库

本仓库用于管理《计算机图形学》课程的各次编程作业（HW1、HW2……），每次作业一个子目录。

## 目录结构

```
cg-coursework/
├── README.md              本文件
├── .gitignore             Git 忽略规则
├── tools/                 通用工具
│   ├── build-submission.ps1   生成雨课堂提交包
│   ├── start-server.bat       一键启动本地服务器（Windows 双击）
│   └── start-server.ps1       同上，PowerShell 版
├── hw1/                   作业1：2D图形的交互绘制
│   ├── hw1Code/           源码（可直接运行的完整页面）
│   │   ├── hw1.html       入口页面
│   │   ├── hw1.js         主程序
│   │   ├── shaders/       顶点/片元着色器
│   │   └── Common/        课程提供的公共库
│   ├── report/            报告与素材
│   │   ├── HW1-报告.docx              实验报告
│   │   ├── 2024HW1作业要求和说明.txt   作业要求
│   │   └── 2024HW1基本功能完成效果.mp4 功能演示视频
│   ├── submission/        雨课堂提交包（含 HW1.zip）
│   ├── readme.md          说明文档
│   └── fill_report.py     生成报告 docx 的脚本
└── hw2/                   作业2（待完成）
```

## 作业完成情况

| 作业 | 主题 | 基本要求 | 附加项 | 状态 |
|---|---|---|---|---|
| hw1 | 2D图形的交互绘制 | 鼠标点击处为中心重绘 + 随机色（80分） | ②分形图 + slider控递归次数（20分） | 已完成 |
| hw2 | — | — | — | 待开始 |

## 运行方式

各次作业的运行说明见对应目录下的 `readme.md`。以 hw1 为例：

```bash
cd hw1/hw1Code
python -m http.server 8000
# 浏览器访问 http://localhost:8000/hw1.html
```

也可直接双击各作业 `submission/executable/` 下的 `start-server.bat`（Windows 一键启动）。

> 注意：本项目通过同步 AJAX 读取着色器源码文件，**必须用本地 HTTP 服务器访问**，
> 直接双击打开的 `file://` 页面会被浏览器同源策略拦截而无法运行。

> 说明：`submission/` 里的目录名统一用英文（`source` / `executable` / `report`），
> 避免不同系统解压时中文目录名乱码；提交包里额外保留了一份中文名 `可执行程序/` 副本便于老师查找。

## 环境要求

- 浏览器：支持 WebGL 2.0 的现代浏览器（Chrome / Edge / Firefox）
- 辅助工具：Python 3（仅用于启动本地静态服务器）或 Node.js

## 提交说明

- 平台：雨课堂智慧平台 scu.yuketang.cn
- 提交内容：程序包（源码 + 可执行程序 + readme）+ 报告
- 提交方式：每小组提交一份
- 每次作业的提交压缩包位于 `hwN/submission/HWN.zip`（如 `hw1/submission/HW1.zip`）

## Git 工作流

远程仓库：`git@github.com:EdwardXiao-bit/cg-coursework.git`（SSH 方式，私有仓库）

```bash
# 完成一次作业后
git add .
git commit -m "feat(hw2): 完成作业2基本要求与附加项"
git push
```

### 推送方式备忘（重要）

本机网络环境下 **GitHub 的 HTTPS(443) 端口被阻断**，直连会报：

```
fatal: unable to access 'https://github.com/...': Recv failure: Connection was reset
```

而 **SSH(22) 端口可以正常连通**，因此本仓库必须使用 SSH 地址推送：

```bash
git remote -v
# 应为 git@github.com:EdwardXiao-bit/cg-coursework.git
ssh -T git@github.com      # 验证：应显示 Hi EdwardXiao-bit! You've successfully authenticated
```

排障记录：

1. **不要用 HTTPS 地址**，即使能打开 github.com 网页也会在推送时被重置。
2. **若 `ssh -T` 报 `Permission denied (publickey)`**，说明公钥没被 SSH 认到。
   本机 `ssh-agent` 服务默认为「禁用」，仅靠 `~/.ssh/id_rsa` 也应能认证；
   若不能，用管理员 PowerShell 执行：
   ```powershell
   Set-Service ssh-agent -StartupType Automatic
   Start-Service ssh-agent
   ssh-add "$env:USERPROFILE\.ssh\id_rsa"
   ```
3. **若报 `ERROR: Repository not found`**，检查远程 URL 里的用户名是否写对
   （本账号为 `EdwardXiao-bit`，不是邮箱前缀）。

## 用 AI 助手（DeepSeek Harness）继续做后续作业

DSH 的**工作目录（workspace）取决于启动时所在的文件夹**，会话本身不"记住"路径。
因此每次做作业时，**先 `cd` 进本仓库再启动**，助手才能看到全部作业文件：

```powershell
cd C:\Users\Ed\vscode_projects\cg-coursework
dsh web
```

或者直接双击仓库根目录下的一键脚本 `work-on-cg.bat`（它内部先 `cd` 到仓库根再启动）。

启动后浏览器访问 <http://127.0.0.1:3080>。**注意不要**在别处（例如空的旧目录）启动，
否则助手看不到作业文件。

### 换一台电脑怎么继续

```powershell
git clone git@github.com:EdwardXiao-bit/cg-coursework.git
cd cg-coursework
dsh web
```

### 开始新一次作业（例如 HW2）的流程

```powershell
cd C:\Users\Ed\vscode_projects\cg-coursework
mkdir hw2                                    # 新建作业目录
# 放好 hw2\hw2Code\ 与 hw2\report\ 后：
.\tools\build-submission.ps1 -Hw hw2         # 生成 hw2\submission\HW2.zip
git add .
git commit -m "feat(hw2): 完成作业2"
git push
```

用 AI 助手时，只需在对话里说明"这次做 HW2"，助手就会在 `hw2/` 下开展，
不会动到已完成的 `hw1/`。

### 提交包命名与内容约定

| 约定 | 说明 |
|---|---|
| 压缩包名 | `hwN` → **`HWN.zip`**（如 `hw1` → `HW1.zip`）；需要别的名字加 `-ZipName` |
| 包内顶层目录 | 统一多一层 `HWN/`（如 `HW1/`），解压后是一个干净的作业文件夹，不会散落一地 |
| 演示视频 | **默认不放**进提交包。需要时加 `-IncludeVideo` 开关 |
| 源码目录 | `hwN` → `hwNCode`（脚本自动推导，换作业无需改脚本） |

#### 提交包内部结构

提交的内容是「程序包（源码 + 可执行程序 + readme 说明文档）+ 报告」，
统一装进一个 `HWN.zip` 里。以 hw1 为例：

```
HW1.zip
└── HW1/
    ├── source/            源码（自己写的 hw1.html / hw1.js / shaders/）
    ├── executable/        可执行程序（完整可运行：hw1Code/ + start-server 脚本）
    ├── 可执行程序/         ↑ 的中文名副本，方便老师直接找到
    ├── readme.md          说明文档（运行方式、实现要点）
    └── HW1-报告.docx       实验报告
```

```powershell
# 常规：不含视频，生成 hw2\submission\HW2.zip
.\tools\build-submission.ps1 -Hw hw2

# 需要把演示视频一起打包时
.\tools\build-submission.ps1 -Hw hw2 -IncludeVideo

# 自定义压缩包名
.\tools\build-submission.ps1 -Hw hw2 -ZipName "作业2提交.zip"
```

> 脚本每次把 `hwN/submission/` 整个重建后再打包，旧的 zip 会先删掉，不会出现「包中包」。
> 打包用 .NET `ZipArchive` 手工写入（而不是 `Compress-Archive`），以保证两点：
> 条目名用 `/` 分隔（PS 5.1 的 `Compress-Archive` 会写成 `\`，解压到 macOS/Linux 时不会被当目录分隔符），
> 且中文目录名带正确的 UTF-8 语言标志位（否则 `可执行程序/` 会乱码）。
> 脚本运行完会把 zip 里的条目读回来打印，末尾直接给出 `nested zip / demo video` 的核对结果。

