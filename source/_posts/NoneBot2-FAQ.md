---
title: NoneBot2 新手 FAQ
date: 2022-09-09 09:26:50
tags: 
  - nonebot2
  - FAQ
  - CQCode
  - go-cqhttp
  - onebot
---

这里整理了一些新手经常提问的问题，这些问题往往很简单（大部分在[文档](https://v2.nonebot.dev)里均有相关内容），但是可能因为某些原因，会导致下面的错误

下面将根据如下常常提问的问题进行解答

## 我要快速精通 Python

洗洗睡吧，学习都是循序渐进的

你要是能 3 天精通 Python，为什么不去找工作呢

## 有没有通俗易懂的 NoneBot 教程

[Well404的教程](http://blog.well404.top/2022/01/30/nonebot/%E3%80%90NoneBot2%E3%80%91%E5%89%8D%E8%A8%80%E2%80%94%E2%80%94%E4%BD%BF%E7%94%A8NoneBot2%E6%90%AD%E5%BB%BAQQ%E6%9C%BA%E5%99%A8%E4%BA%BA/)

## Bad Handshake(403)

未注册协议适配器

相关文档：[使用适配器](https://v2.nonebot.dev/docs/tutorial/register-adapter)、[配置连接](https://onebot.adapters.nonebot.dev/docs/guide/setup/)

在 `bot.py` 添加如下代码

```python bot.py
# 导入替换为对应的适配器，go-cqhttp 为 OneBot 协议
from nonebot.adapters.onebot.v11 import Adapter
driver.register_adapter(Adapter)
```

记得下次在脚手架选中适配器

![选择适配器](/images/cli-select-adapter.png)

## TypeError: Driver.register_adapter() takes 2 positional arguments but 3 were given

NoneBot2 beta-1 版本修改了注册适配器的方式，需要传入适配器 `Adapter`

若想使用老版本请在安装时指定

```bash
python3 -m pip install nonebot2==2.0.0a16
```

注册适配器参考上面

## nb: 命令未找到

可能是未安装脚手架，或脚手架不在Path中

相关文档：[使用脚手架](https://v2.nonebot.dev/docs/start/nb-cli)

可使用 `python3 -m nb_cli` 代替

```bash
python3 -m nb_cli
```

## 如何发送图片

**发送图片以 OneBot 协议适配器为演示**

**麻烦不要使用 CQ 码了**

相关文档：[处理消息](https://v2.nonebot.dev/docs/tutorial/process-message)、[MessageSegment-image](https://onebot.adapters.nonebot.dev/docs/api/v11/message#MessageSegment-image)

使用 `MessageSegment.image` 构造图片消息段

支持 `Path`、`str`、`BytesIO` 和 `bytes` 类型

```python foo/__init__.py
from io import BytesIO
from pathlib import Path

from nonebot import on_message
from nonebot.adapters.onebot.v11 import MessageSegment

foo = on_message()


@foo.handle()
async def _():
    # 当前文件目录的 `img.png` 文件
    path = Path(__file__).parent / "img.png"
    
    with open(path, "rb") as f:
        # 传入 BytesIO 与 bytes 无异
        byte: bytes = f.read()
        bio = BytesIO(byte)

    # 以路径形式发送 file uri
    path_image = MessageSegment.image(path)
    # 以 base64 发送 base64://
    byte_image = MessageSegment.image(byte)
    bio_image = MessageSegment.image(bio)
    # 以 str 发送，需要填入完整链接
    str_image = MessageSegment.image("https://")

    # 任选其一发送即可
    await foo.send(path_image)
```

## ValidationError

未填写插件的配置

请在 `.env`、`.env.dev` 或 `.env.prod` 填写插件的配置

配置参考插件的文档

## NotImplementedError 且 Traceback 出现 `asyncio` 字样

未关闭重载

相关文档：[选择驱动器#fastapi_reload](https://v2.nonebot.dev/docs/tutorial/choose-driver#fastapi_reload)

在配置关闭 `fastapi_reload` 即可，或者切换驱动器

也可参考 [nonebot/nonebot2#376 (Comment)](https://github.com/nonebot/nonebot2/issues/376#issuecomment-846523618) 的猴子补丁修复

详情参考 [nonebot/nonebot2#376](https://github.com/nonebot/nonebot2/issues/376)、[nonebot/nonebot2#830](https://github.com/nonebot/nonebot2/issues/830)

## 二维码登录提示存在危险

腾讯修改了二维码登录，增加了更严格的限制，需要在同一区域才可以使用二维码登录

目前可以的解决办法：

1.服务器开代理服务器，手机连接代理扫码登录
2.本地登录，将设备信息（`device.json`）和 Token（session.token）上传到服务器
3.使用滑条登录（需要 rc3 及以上）

## 账号被风控

tx不开心，把你的机器人风控了（我们称之为喜报）

![喜报](/images/can't-send-msg.gif)

目前可能解除风控的办法：

1.切换协议为 MacOS
2.使用企业QQ~~（你不一定能买得起）~~
~~3.收购腾讯~~

## Check your plugin name

插件重复加载，检查 `bot.py` 和 `pyproject.toml` 是否已经加载（比如已经在 `pyproject.toml` 如下设置，请删除 `bot.py` 的加载代码）

```toml pyproject.toml
[tool.nonebot]
plugins = []
plugin_dirs = ["src/plugins"]
```

具体情况因配置而异

## 为什么没有 XX 功能

你去提 [PR](https://github.com/nonebot/nonebot2/pulls) 就有了

## 最后

如果这个文章无法帮到你，请多翻阅[文档](https://v2.nonebot.dev)，那里可能有你想要的答案

也可通过[这些方式](https://v2.nonebot.dev/docs/start/question)提问

### 提问前须知

NoneBot 的文档是免费的，这篇文章也是免费的，没有人从你的手里拿走了一分钱

请以谦虚的态度提问，并发送相关日志，截图，代码片段

截图请截取关键点，且尽量完整

![有用的报错你是一行没截到.jpg](/images/junk-screenshot.jpg)

**建议阅读[提问的智慧](https://github.com/ryanhanwu/How-To-Ask-Questions-The-Smart-Way/blob/main/README-zh_CN.md)**
