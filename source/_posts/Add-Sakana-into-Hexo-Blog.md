---
title: 在 Hexo 中使用 Sakana! 组件
date: 2022-09-11 17:00:36
tags:
  - hexo
  - "lycoris recoil"
categories:
---

~~没有石蒜第12话看我要死了~~

## 插件概述

插件 GitHub 地址：[MingxuanGame/hexo-sakana](https://github.com/MingxuanGame/hexo-sakana)

> 此 Hexo 插件用于在渲染 HTML 时将 Sakana! Widget 组件注入进 body 内，以非侵入式方式加载石蒜组件。
>
> 注入代码参考 [EYHN/hexo-helper-live2d](https://github.com/EYHN/hexo-helper-live2d/blob/master/index.js#L234-L240)。

~~直接cv readme~~

## 安装

直接 npm

```bash
npm install hexo-sakana --save
```

速度慢可以用镜像

```bash
npm install hexo-sakana --save --registry=https://registry.npm.taobao.org
```

如果你没有修改配置而直接重启，当你在右下角看到小泷奈的时候，恭喜安装成功！

![Sakana~](/images/sakana/sakana.gif)

## 配置

在你的配置文件（通常是 `_config.yml` 或 `_config.[theme].yml`）添加如下内容

```yaml
sakana:
  # 默认角色
  character: takina
  # 是否启用
  enable: true
  # 是否在移动端启用
  enable_mobile: false
  #  组件大小，默认为 200
  size: 200
  # 自适应容器大小 （最小 120px）
  # 另见：https://github.com/dsrkafuu/sakana-widget/blob/main/README.zh.md#%E8%87%AA%E5%8A%A8%E7%BC%A9%E6%94%BE
  autoFit: false
  # 组件据底部距离，需填写单位或百分号
  bottom: 0px
  # 是否启用控制栏
  controls: true
  # 线条设置
  stroke:
    # 颜色
    color: "#b4b4b4"
    # 粗细
    width: 10
  # 停止动画的阈值
  threshold: 0.1
  # 旋转角度
  rotate: 0
  # 自定义角色
  # customCharacters:
  #   - base: takina
  #     name: takina1
  #     ...
```

上述配置文件可以省略部分/全部配置，省略后使用默认值

`customCharacters` 为一个列表，每个元素如下：

```yaml
# 基础角色，必须为 takina（即井之上泷奈）或 chisato（即锦木千束）
base: takina
# 名称，设置默认角色时可填写
name: takina1
# 自定义图片（url 或 base64）
image: >-
  https://raw.githubusercontent.com/dsrkafuu/sakana-widget/master/src/characters/takina.png
# 惯性
i: 0.08
# 粘性
s: 0.1
# 衰减
d: 0.988
# 角度
r: 12
# 高度
"y": 2
# 垂直速度
t: 0
# 水平速度
w: 0
```

其中 `base` 和 `name` 为必填，未填写的则会使用 `base` 对应角色的默认值，见 https://github.com/dsrkafuu/sakana-widget/blob/main/src/characters/index.ts#L40-L64

## 自定义角色的例子

### 超慢速永续千束

```yaml
base: chisato
name: slow-chisato
i: 0.001
d: 1
```

![slow-chisato](/images/sakana/slow-chisato.gif)

~~井之上千束~~

### 自定义图片

```yaml
base: chisato
name: github
image: "https://raw.githubusercontent.com/dsrkafuu/sakana-widget/main/public/github.png"
```

![github](/images/sakana/custom-image.gif)

### 吉松千束

~~令人眼前一黑的角色增加了~~

（图片来自莉可丽丝官网 [吉松シンジ](https://lycoris-recoil.com/character/?chara=shinji)）

```yaml
base: chisato
name: shinji
image: "https://lycoris-recoil.com/assets/img/character/chara_shinji.png"
```

![shinji](/images/sakana/shinji.png)

（好奇怪啊喂！〒▽〒）

## 许可

hexo-sakana 基于 MIT 协议授权，**不可用于任何商业活动**，其基于 https://github.com/dsrkafuu/sakana-widget 开发

许可证文件：[LICENSE](https://github.com/MingxuanGame/hexo-sakana/blob/master/LICENSE)

本页面代码引用的所有外部图片归版权方所有
