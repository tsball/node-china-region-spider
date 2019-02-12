# 中国统计局省市区镇（街道）采集器
## 1. 技术构成
推荐使用 yarn 安装 js lib。  
- 数据采集： puppeteer  
  因为 cn 经常安装失败，推荐使用指定源进行安装： PUPPETEER_DOWNLOAD_HOST=https://storage.googleapis.com.cnpmjs.org npm i puppeteer
- 数据存储： sqlite

## 2. 执行脚本
```
// 获取最新的记录
node index.js

// 获取指定年份的记录
node index.js 2014
```
