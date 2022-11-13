---
title: 请选择你的报错 —— NoneBot2/go-cqhttp 常见报错处理
date: 2022-11-13 18:09:03
tags:
  - nonebot2
  - go-cqhttp
  - onebot
categories:
---

本界面整理了 NoneBot2/go-cqhttp 可能发生的报错，仅供参考

投稿或提建议：通过 [Issue](https://github.com/MingxuanGame/blog/issues)

## 目录

* ImportError: cannot import name 'export' from 'nonebot' 或 ImportError: cannot import name 'State' from 'nonebot.params'
* command not found: nb 或 'nb' 不是内部或外部命令，也不是可运行的程序或批处理文件。
* ModuleNotFoundError: No module named 'nonebot' 或 ModuleNotFoundError: No module named 'nonebot.adapters.onebot.v11'
* ImportError: cannot import name 'xxx' from nonebot
* RuntimeError('Config file does not exist!')
* connection failed (403 Forbidden)
* pydantic.error_wrappers.ValidationError: x validation error for
* nonebot.adapters.onebot.v11.exception.ActionFailed
  * \[WARNING\]: 群消息发送失败：账号可能被风控
  * 群消息发送失败：账号可能被风控 并伴有红色 packet error: 46 错误
  * 转换 CQ 码 到 MiraiGo Element 时出现错误 将忽略本段 CQ 码.
    * exec: "ffmpeg": executable file not found in PATH
    * file not found
  * \[WARNING\]: 获取消息时出现错误: get value error: leveldb: not found

## ImportError: cannot import name 'export' from 'nonebot' 或 ImportError: cannot import name 'State' from 'nonebot.params'

NoneBot2 版本大于或等于 2.0.0rc1

解决方式：

降级

```bash
pip install nonebot2==2.0.0b5
```

!!! warning 注意
    如果你的插件有用到定时插件 `nonebot_plugin_apscheduler`（一般为出现 `cannot import name 'export' from 'nonebot'` 时），请将定时插件一并降级到 `0.1.4`

    ```bash
    pip install nonebot_plugin_apscheduler==0.1.4
    ```

<details>
  <summary>问题分析</summary>

NoneBot 在 2.0.0rc1 版移除了 `State` 与 `export`

详见：
  * [版本发布页](https://github.com/nonebot/nonebot2/releases/tag/v2.0.0-rc.1)
  * [nonebot/nonebot2#935](https://github.com/nonebot/nonebot2/issues/935)
  * [nonebot/nonebot2#1160](https://github.com/nonebot/nonebot2/pull/1160)

</details>

## command not found: nb 或 'nb' 不是内部或外部命令，也不是可运行的程序或批处理文件。

你的 nb-cli 没有添加到环境变量，可选择使用 `python -m nb_cli` 替换 `nb`

!!! note 提示
    一些系统<!-- （Ubuntu 就是你） -->可能会提示你使用 `apt` 安装一个包，那个包与 NoneBot 无关，不用安装

## ModuleNotFoundError: No module named 'nonebot' 或 ModuleNotFoundError: No module named 'nonebot.adapters.onebot.v11'

如果你不是在开玩笑，那么请检查下你的环境

如果使用虚拟环境，请检查是否进入环境

如果拥有多个解释器，且在编辑器（例如 VSCode 或 PyCharm）的终端运行，请检查编辑器的解释器设置与终端运行所使用的解释器是否一致

如果在虚拟环境中使用 `nb run` 出现与此相关的报错，请使用 `python bot.py` 运行

<details>
  <summary>最后一种情况的分析</summary>

> nb-cli 正在进行重构，此段的内容可能会随时失效，仅供参考

重构前：

nb-cli 运行 NoneBot 的原理是导入机器人入口文件使 NoneBot 初始化然后调用 `nonebot.run()` 运行

所以实际运行的环境为 nb-cli 安装的环境

参考：[nb-cli/nb_cli/handlers/deploy.py](https://github.com/nonebot/nb-cli/blob/b428a9a24091c072accedbeee56064c6a3cfd15a/nb_cli/handlers/deploy.py#L14-L26)

---

重构后：

nb-cli 运行 NoneBot 的原理是开启一个子进程，子进程的环境并非虚拟环境

所以实际运行的环境为 nb-cli 安装的环境

参考：[nb-cli/nb_cli/loader/process.py](https://github.com/nonebot/nb-cli/blob/c2e57dee7e9a03543d04bb8ebf1d9967d22da07e/nb_cli/loader/process.py#L22-L60)

</details>

## ImportError: cannot import name 'xxx' from nonebot

[NoneBot1](https://github.com/nonebot/nonebot) 与 NoneBot2 混装

解决方式：

卸载 NoneBot1 和 NoneBot2，然后重新安装所需要的版本

```bash
pip uninstall nonebot
pip uninstall nonebot2
```

参考：[nonebot/discussions#13 (comment)](https://github.com/nonebot/discussions/discussions/13#discussioncomment-738461)

<details>
  <summary>问题分析</summary>

NoneBot1 与 NoneBot2 使用同一命名空间 `nonebot`

同时安装后，部分文件会被替换为另一版本的文件，故导致此错误

</details>

## RuntimeError('Config file does not exist!')

使用 nb-cli 没有切换至项目文件夹

解决方式：

切换至项目文件夹

例如使用 nb-cli 创建的项目文件夹叫 `example`，则

```bash
cd ./example/
```

然后重新执行安装插件的命令

<details>
  <summary>问题分析</summary>

> nb-cli 正在进行重构，此段的内容可能会随时失效，仅供参考

nb-cli 会将安装的插件的名称写入到当前目录的 `pyproject.toml` 中加载插件

该文件未找到时，引发 `RuntimeError` 错误

参考：[nb-cli/nb_cli/config.py](https://github.com/nonebot/nb-cli/blob/c2e57dee7e9a03543d04bb8ebf1d9967d22da07e/nb_cli/config.py#L79)

</details>

## connection failed (403 Forbidden)

未注册适配器

解决方式：

在 `bot.py` 导入你所需要的适配器（QQ 机器人导入 `nonebot.adapter.onebot.v11.Adapter`），然后使用 `register_adapter` 注册适配器（在 `nonebot.init` 后添加）

像这样

```python
import nonebot
from nonebot.adapter.onebot.v11 import Adapter  # 这里

...

nonebot.init()
driver = nonebot.get_driver()
driver.register_adapter(Adapter)  # 这里
```

如果适配器尚未安装，请参考下方提供的文档安装适配器

参考：

- [安装适配器](https://v2.nonebot.dev/docs/start/install-adapter)
- [使用适配器](https://v2.nonebot.dev/docs/tutorial/register-adapter)

<details>
  <summary>问题分析</summary>

未注册适配器，你连接的路径不存在

对于不存在路径的 WebSocket 连接会直接以 403 Forbidden 拒绝

</details>

## pydantic.error_wrappers.ValidationError: x validation error for

你没有在配置文件内填写你安装的插件所需的配置项，或者配置项填写错误

解决方式：

点进插件的 GitHub（在插件卡片的右上角），阅读相关文档/`README.md`填写配置

配置一般位于 `.env.dev`

参考：[配置](https://v2.nonebot.dev/docs/tutorial/configuration)

<details>
  <summary>问题分析</summary>

插件一般使用 `pydantic` 解析配置

对于必须填写的项如果不存在，或者配置项类型错误均会报错

</details>

## nonebot.adapters.onebot.v11.exception.ActionFailed

请查看 go-cqhttp 端的输出

### 1. [WARNING]: 群消息发送失败：账号可能被风控

运气问题，可能挂几天就好了（？）

### 2. 群消息发送失败：账号可能被风控 并伴有红色 packet error: 46 错误

> 你的账号因系统检测或多人举报涉及及进行业务违规操作，暂不能发送群消息。

登录机器人的号，点击下面的链接解封

https://accounts.qq.com/safe/message/unlock?lock_info=5_5

### 3. 转换 CQ 码 到 MiraiGo Element 时出现错误 将忽略本段 CQ 码.

#### 3.1 exec: "ffmpeg": executable file not found in PATH

未安装 ffmpeg，请自行搜索安装 ffmpeg 的教程

#### 3.2 file not found

发送的图片/语音/视频等的本地目录方式填写有误，比如下面这样

```python
    ...
    await matcher.send(MessageSegment.image("/home/user/image.png"))
    ...
```

本地目录需使用 file uri（`file://`），或者使用 [`pathlib.Path`](https://docs.python.org/zh-cn/3/library/pathlib.html#pathlib.Path) 进行包装（推荐）

参考：[pathlib](https://docs.python.org/zh-cn/3/library/pathlib.html)

修改后的代码如下

```python
from pathlib import Path
...
    ...
    await matcher.send(MessageSegment.image(Path("/home/user/image.png")))
    ...
```

此外，对于使用 CQ 码发送的，例如下方

```python
    ...
    await matcher.send(Message("[CQ:image,file=/home/user/image.png]"))
    ...
```

请使用上面的 `MessageSegment` 的方法来构造图片/语音/视频等消息

### 4. [WARNING]: 获取消息时出现错误: get value error: leveldb: not found

!!! warning 注意
    go-cqhttp 正在重构数据库部分，将使用 sqlite3，错误信息可能与此有差异

一般是收到的消息有回复的情况，正常情况下可以不用管

---
