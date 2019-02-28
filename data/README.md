数据存放采集下来的数据，按年份分别保存为 provinces, cities, districts, towns 表

数据 | 表名 | 字段
---|---|---
省 | provinces | id, name, code, year, citiesCount
地级市 | cities | id, name, code, year, districtsCount, provinceId
区/县 | districts | id, name, code, year, townsCount, cityId
镇/街道办 | towns | id, name, code, year