const puppeteer = require('puppeteer')
const program = require('commander')

// database models
const Province = require('./models/province.js')
const City = require('./models/city.js')
const District = require('./models/district.js')
const Town = require('./models/town.js')

const depthProvince = 1
const depthCity = 2
const depthDistrict = 3
const depthTown = 4

program
  .version('1.0.0')
  .usage('[options] <file ...>')
  .option('-h, --headless <boolean>', '无头模式（没有界面）', /^(y|n)$/i, 'n')
  .option('-d, --depth <d>', '采集指定行政级别深度的地区数据 (provice/city/district/town) ', myParseInt, depthDistrict)
  .option('-y, --year <y>', '采集指定年份的数据', myParseInt, 2018)
  .option('-c, --concurrency <c>', '并发数', myParseInt, 3)
  .option('-i, --interval <i>', '采集休息的间隙', myParseInt, 500)
  .option('-t, --timeout <t>', '超时时间', myParseInt, 3000)
  .parse(process.argv)

function myParseInt(string, defaultValue) {
  var int = parseInt(string, 10);

  if (typeof int == 'number') {
    return int;
  } else {
    return defaultValue;
  }
}

console.log("Headless is: " + program.headless)
console.log("Depth is: " + program.depth)
console.log("Year is: " + program.year)
console.log("Concurrency is: " + program.concurrency)
console.log("Interval is: " + program.interval)
console.log("Timeout is: " + program.timeout)
const headless = program.headless === 'y'
const year = program.year
const interval = program.interval
const timeout = program.timeout
const depth = program.depth

// 并发数，同时打开多个tabs
const concurrency = program.concurrency

async function run() {
  const browser = await puppeteer.launch({
    headless: headless,
    devtools: true
  })

  let page = await browser.newPage()

  if (canReachDepth(depthProvince, depth)) {
    await initProvinces(page)
  }

  if (canReachDepth(depthCity, depth)) {
    await initCities(page, browser)
  }

  if (canReachDepth(depthDistrict, depth)) {
    await initDistricts(page, browser)
  }

  if (canReachDepth(depthTown, depth)) {
    await initTowns(page, browser)
  }
  
}

/**
 * 判断是否在该深度里
 * @param {Number} requiredDepth 需要的深度
 * @param {Number} targetDepth 目标深度
 */
function canReachDepth(requiredDepth, targetDepth) {
  return targetDepth >= requiredDepth
}

async function initProvinces(page) {
  await gotoPageWithAutoRetry(page, 'http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/'+ year +'/index.html')
  setPageProps(page)
  const provinces = await getProvinces(page)
  await saveProvinces(provinces)
}

async function initCities(page, browser) {
  const provincesWithoutFullCities = await getProvincesWithoutFullCities(year)
  for (let i = 0; i < provincesWithoutFullCities.length; i += concurrency) {
    let provincePromises = []
    for (let j = 0; j < concurrency && i+j < provincesWithoutFullCities.length; j++) {
      let province = provincesWithoutFullCities[i+j]
      console.log("(" + (i + j + 1) + "/" + provincesWithoutFullCities.length + ") Start to get cities of province " + province.name)
      provincePromises.push(getAndSaveProvinceCities(browser, year, province))
    }
    await mergePromises(provincePromises)
    page.waitFor(interval) // 等待，避免访问频繁被拦截
  }
}

async function initDistricts(page, browser) {
  const citiesWithoutFullDistricts = await getCitiesWithoutFullDistricts(year)
  for (let i = 0; i < citiesWithoutFullDistricts.length; i += 3) {
    let cityPromises = []
    for (let j = 0; j < concurrency && i+j < citiesWithoutFullDistricts.length; j++) {
      let city = citiesWithoutFullDistricts[i+j]
      console.log("(" + (i + j + 1) + "/" + citiesWithoutFullDistricts.length + ") Start to get districts of city " + city.name)
      cityPromises.push(getAndSaveCitiyDistricts(browser, year, city))
    }
    await mergePromises(cityPromises)
    page.waitFor(interval) // 等待，避免访问频繁被拦截
  }
}

async function initTowns(page, browser) {
  const districtsWithoutFulltowns = await getDistrictsWithoutFullTowns(year)
  for (let i = 0; i < districtsWithoutFulltowns.length; i += 3) {
    let districtPromises = []
    for (let j = 0; j < concurrency && i+j < districtsWithoutFulltowns.length; j++) {
      let district = districtsWithoutFulltowns[i+j]
      console.log("(" + (i + j + 1) + "/" + districtsWithoutFulltowns.length + ") Start to get towns of district " + district.name)
      districtPromises.push(getAndSaveDistrictTowns(browser, year, district))
    }
    await mergePromises(districtPromises)
    page.waitFor(interval) // 等待，避免访问频繁被拦截
  }
}


/**
 * 获取并保存指定省份的城市列表
 * @param {*} browser 
 * @param {*} year 
 * @param {*} province 
 */
async function getAndSaveProvinceCities(browser, year, province) {
  const cities = await getCities(browser, province)
  await saveProvinceCities(year, province, cities)
  await updateProvinceCitiesCount(year, province.code, cities.length)
}

/**
 * 获取并保存指定城市的区列表
 * @param {*} browser 
 * @param {*} year 
 * @param {*} city 
 */
async function getAndSaveCitiyDistricts(browser, year, city) {
  const districts = await getDistricts(browser, city)
  await saveCityDistricts(year, city, districts)
  await updateCityDistrictsCount(year, city.code, districts.length)
}

/**
 * 获取并保存指定区的镇列表
 * @param {*} browser 
 * @param {*} year
 * @param {*} district
 */
async function getAndSaveDistrictTowns(browser, year, district) {
  const towns = await getTowns(browser, district)
  await saveDistrictTowns(year, district, towns)
  await updateDistrictTownsCount(year, district.code, towns.length)
}

/**
 * 获取省份信息
 * @param  {page} 省份所在的页面
 * @return {provinces} 所有省份   
 */
async function getProvinces(page) {
  const provinces = await page.$$eval('.provincetr a', provinceLinkElems => { 
    return provinceLinkElems.map(provinceLinkElem => {
      let province = {}
      // url sample: http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/65.html
      const urlParts = provinceLinkElem.href.split('/')
      const codeHead = urlParts[urlParts.length - 1].split('.')[0]
      province.url = provinceLinkElem.href
      province.name = provinceLinkElem.innerText
      province.code = codeHead+'0000000000'
      return province
    }) 
  })
  return provinces
}

/**
 * 获取城市信息
 * @param  {browser} 浏览器
 * @param  {province} 省份信息
 * @return {cities} 所有城市  
 */
async function getCities(browser, province) {
  let page = await browser.newPage()
  setPageProps(page)
  await gotoPageWithAutoRetry(page, province.url)
  const cities = await page.evaluate(() => {
    // 城市页面里一层tr含有code、name两个a标签
    const cityTrElements = document.querySelectorAll('.citytr')
    // debugger
    const provinceCities = Array.prototype.map.call(cityTrElements, cityTrElement => { 
      const cityLinkElements = cityTrElement.querySelectorAll('a')
      let city = {}
      city.code = cityLinkElements[0].innerText
      city.name = cityLinkElements[1].innerText
      city.url = cityLinkElements[1].href
      return city
    })
    return provinceCities
  })
  
  page.close()
  console.log("Cities of " + province.name + " is " + cities.map(city => city.name).join(' , '))
  return cities
}

/**
 * 获取区信息
 * @param  {browser} 浏览器
 * @param  {city} 城市信息
 * @return {districts} 所有区  
 */
async function getDistricts(browser, city) {
  let page = await browser.newPage()
  setPageProps(page)
  await gotoPageWithAutoRetry(page, city.url)
  const districts = await page.evaluate(() => {
    // 区页面里一层tr含有code、name两个a标签
    const districtTrElements = document.querySelectorAll('.countytr')

    const cityDistricts = Array.prototype.map.call(districtTrElements, districtTrElement => { 
      const districtTdElements = districtTrElement.querySelectorAll('td')
      let district = {}
      let linkElement = districtTdElements[1].querySelector('a')
      let url = linkElement==null ? null : linkElement.href
      district.code = districtTdElements[0].innerText
      district.name = districtTdElements[1].innerText
      district.url = url

      return district
    })
    return cityDistricts.filter(district => district.name != '市辖区')
  })
  
  page.close()
  console.log("Districts of " + city.name + " is " + districts.map(district => district.name).join(' , '))
  return districts
}

/**
 * 获取镇（街道）信息
 * @param  {browser} 浏览器
 * @param  {district} 区信息
 * @return {towns} 所有镇 
 */
async function getTowns(browser, district) {
  let page = await browser.newPage()
  setPageProps(page)
  await gotoPageWithAutoRetry(page, district.url)
  const towns = await page.evaluate(() => {
    // 镇页面里一层tr含有code、name两个a标签
    const townTrElements = document.querySelectorAll('.towntr')
    const districtTowns = Array.prototype.map.call(townTrElements, townTrElement => { 
      const townLinkElements = townTrElement.querySelectorAll('a')
      if(townLinkElements.length > 0){
        let town = {}
        town.code = townLinkElements[0].innerText
        town.name = townLinkElements[1].innerText
        return town
      }
      
    })
    return districtTowns
  })
  
  page.close()
  console.log("Towns of " + district.name + " is " + towns.map(town => town.name).join(' , '))
  return towns
}

async function mergePromises(promises) {
  const results = await Promise.all(promises)
  return Array.prototype.concat.apply([], results)
}

/**
 * 获取城市列表不完整的所有省份信息
 * @param {year} 对应的年份
 */
async function getProvincesWithoutFullCities(year) {
  provinces = await Province.findAll({
    where: {
      year: year,
      citiesCount: null
    }
  })
  return provinces
}

/**
 * 获取区列表不完整的所有城市信息
 * @param {year} 对应的年份
 */
async function getCitiesWithoutFullDistricts(year) {
  cities = await City.findAll({
    where: {
      year: year,
      districtsCount: null
    }
  })
  return cities
}

/**
 * 获取镇列表不完整的所有区信息
 * @param {year} provinceCode 
 */
async function getDistrictsWithoutFullTowns(year) {
  districts = await District.findAll({
    where : {
      year: year,
      townsCount: null
    }
  })
  return districts.filter(district => district.url != null)
}

/**
 * 指定省份的城市信息是否都完整
 * @param {provinceCode} 省份的编号
 * @return {boolean}
 */
function isProvinceWithFullCities(provinceCode) {
  province = Province.findOne({
    where: {
      code: proviceCode,
      citiesCount: {
        [Op.ne]: null
      }
    }
  })
  console.log(province)
  return province !== null
}

/**
 * 当前记录是否存在
 * @param {Model} model 
 * @param {Number} year 
 * @param {String} code 
 * @return {Boolean}
 */
async function isRegionExist(model, year, code) {
  region = await model.findOne({
    where: {
      year: year,
      code: code
    }
  })
  return region !== null
}

/**
 * 保存信息到数据库 （如果存在，则不重复保存）
 * @param  {provices} 省份列表
 */
async function saveProvinces(provinces) {
  for (const province of provinces) {
    if (!await isRegionExist(Province, year, province.code)) {
      await Province.create({ 
        year: year,
        name: province.name, 
        code: province.code, 
        url: province.url 
      })
    }
  }
}

/**
 * 更新指定省份的对应城市数量（获取城市列表完成后执行）
 * @param {*} year 
 * @param {*} provinceCode 
 * @param {*} citiesCount 
 */
async function updateProvinceCitiesCount(year, provinceCode, citiesCount) {
  await Province.update({
    citiesCount: citiesCount,
  }, {
    where: {
      year: year,
      code: provinceCode
    }
  })
}

/**
 * 更新指定城市的对应区数量（获取区列表后执行）
 * @param {*} year 
 * @param {*} cityCode 
 * @param {*} districtsCount 
 */
async function updateCityDistrictsCount(year, cityCode, districtsCount) {
  await City.update({
    districtsCount: districtsCount,
  }, {
    where: {
      year: year,
      code: cityCode
    }
  })
}

/**
 * 更新指定区的对应镇数量（获取镇列表后执行）
 * @param {*} year 
 * @param {*} districtCode 
 * @param {*} townsCount 
 */
async function updateDistrictTownsCount(year, districtCode, townsCount) {
  await District.update({
    townsCount: townsCount,
  }, {
    where: {
      year: year,
      code: districtCode
    }
  })
}

/**
 * 打开页面，并且失败自动重试
 * @param {*} page 
 * @param {*} url 
 * @param {*} try_times 
 */
async function gotoPageWithAutoRetry(page, url, try_times = 0) {
  try {
    await page.goto(url, {waitUntil: 'domcontentloaded', timeout: timeout})
  } catch (ex) {
    if (try_times < 3) {
      try_times += 1
      page.waitFor(1000)
      console.warn("Retry to open page: " + url)
      return gotoPageWithAutoRetry(page, url, try_times)
    }
    throw ex
  }
}

/**
 * 保存指定省份的城市信息（只更新不存在的城市列表信息）
 * @param {Number} year 
 * @param {Province} province 
 * @param {Array} cities 
 */
async function saveProvinceCities(year, province, cities) {
  for await (const city of cities) {
    if (!await isRegionExist(City, year, city.code)) {
      await City.create({ 
        year: year,
        name: city.name, 
        code: city.code, 
        url: city.url,
        provinceId: province.id
      })
    }
  }
}

/**
 * 保存指定城市的区信息（只更新不存在的区列表信息）
 * @param {Number} year 
 * @param {City} city 
 * @param {Array} districts 
 */
async function saveCityDistricts(year, city, districts) {
  for (const district of districts) {
    if (!await isRegionExist(District, year, district.code)) {
      await District.create({ 
        year: year,
        name: district.name, 
        code: district.code, 
        url: district.url,
        cityId: city.id
      })
    }
  }
}

/**
 * 保存指定区的镇信息（只更新不存在的镇列表信息）
 * @param {Number} year 
 * @param {District} district 
 * @param {Array} towns 
 */
async function saveDistrictTowns(year, district, towns) {
  for (const town of towns) {
    if (!await isRegionExist(Town, year, town.code)) {
      await Town.create({ 
        year: year,
        name: town.name, 
        code: town.code, 
        districtId: district.id
      })
    }
  }
}

function setPageProps(page) {
  page.setCacheEnabled(true)
  page.setJavaScriptEnabled(false)
  page.setOfflineMode(false)
}

run()
