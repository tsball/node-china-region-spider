# 中国统计局省市区镇（街道）采集器
node-china-region-spider 是一个基于 nodejs 技术，通过访问中国统计局网，获取省、地级市、区（县）、镇（街道）多层行政级别地区的名字 与 编号，并将数据保存到 SQLite 数据库。

目录结构
- [程序特点](#1.-程序特点)
- [数据来源](#2.-数据来源)
- [技术构成](#3.-技术构成)
- [安装](#4.-安装)
- [运行](#5.-运行)
- [参数](#6.-参数)


## 1. 程序特点
- 支持采集不同的行政级别深度
- 支持采集指定的年份数据，并且支持不同年份数据对比，为每年升级提供数据帮助
- 支持自定义多并发采集，提高整体的运行效率
- 访问超时自动重试
- 支持断点续采，避免被拦截后重新开始采集的代价
- 通过访问频率控制，避免容易被服务器察觉并禁止访问

## 2. 数据来源
数据来源于[国家统计局网](http://www.stats.gov.cn)。  

其中，不同年份的行政区域划分： http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/  

## 3. 技术构成
- 数据采集：puppeteer  
  Puppeteer 是一个通过 DevTools Protocol 控制 headless Chrome or Chromium 浏览器的高级 node 库。

- 数据存储： SQLite 文件数据库  
  使用 [sequelize orm](https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/getting-started.md) 进行数据库操作。

  推荐安装 Navicat 客户端，可以查看 SQLite 文件的数据。

- nodejs 库依赖管理：Yarn  
  默认的源安装 puppeteer 经常因为网络问题导致失败，需要采用一下方式：

方式一：修改了源 .npmrc
  
```
type puppeteer_download_host = https://npm.taobao.org/mirrors
```

方式二：使用 npm 单独安装 puppeteer

```
PUPPETEER_DOWNLOAD_HOST=https://storage.googleapis.com.cnpmjs.org npm i puppeteer 
```

## 4. 安装
```sh
# 安装所有的 js 依赖
yarn
```

## 5. 运行
```sh
# 获取最新的记录
node index.js

# 获取指定年份的记录
node index.js -y 2016

# 获取指定行政级别深度的数据（支持 province, city, district, town）
node index.js -d 3
```

## 6. 参数


```sh
# 查看参数指令
$ node index.js --help
```


参数 | 简写 | 值 | 默认值 | 描述  
---|---|---|---|---  
headless | h | y/n | n | 无头模式（没有界面）  
depth | d | 1/2/3/4 | 3 | 采集指定行政级别深度的地区数据 (provice/city/district/town)  
year | y | 数字 | 2016 | 采集指定年份的数据。[查看年份](http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/)  
concurrency | c | 数字 | 3 | 并发请求数  
interval | i | 毫秒 | 500 | 采集数据休息的间隙  
timeout | t | 毫秒 | 3000 | 超时重试的时间  
