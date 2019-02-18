# 中国统计局省市区镇（街道）采集器
## 1. 技术构成
推荐使用 yarn 安装 js lib。  
因为默认的源安装 puppeteer 经常失败，所以增加 .npmrc 修改了源为（https://npm.taobao.org/mirrors）

主要依赖的库：  
- 数据采集： puppeteer  
  如果还安装失败，可以通过设置环境变量的方式安装： PUPPETEER_DOWNLOAD_HOST=https://storage.googleapis.com.cnpmjs.org npm i puppeteer 
- 数据存储： sqlite & sequelize orm  
  参考文档：https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/getting-started.md

## 2. 数据来源
数据来源于：   
国家统计局，网址： http://www.stats.gov.cn  

支持的年份的数据列表： http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/  
某一年的数据网址格式： http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/[YEAR]/index.html  
如2016年的数据网址：
http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/index.html

## 3. 初始化项目
```
// 安装所有的 js 依赖
yarn
```

## 4. 执行脚本
```
// 获取最新的记录
node index.js

// 获取指定年份的记录
node index.js -y 2016

// 获取某深度数据（支持 province, city, district, town）
node index.js -d city
```

## 5. 参数设置

参数 | 简写 | 值 | 描述  
---|---|---|---  
headless | h | y/n | 是否显示界面  
depth | d | province/city/district/town | 抓去深度  
year | y | format as: 2016 | 抓取数据的年份  
