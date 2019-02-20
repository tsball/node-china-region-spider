const puppeteer = require('puppeteer')
const program = require('commander')

// database models
const Province = require('./models/province.js')
const City = require('./models/city.js')

program
  .version('1.0.0')
  .usage('[options] <file ...>')
  .option('-h, --headless <boolean>', 'Headless', /^(y|n)$/i, 'n')
  .option('-d, --depth <depth>', 'Depth of data', /^(province|city|district|town)$/i, 'city')
  .option('-y, --year <n>', 'Data of specified year', parseInt, 2016)
  .option('-c, --concurrency <n>', '并发数', parseInt, 3)
  .parse(process.argv)

console.log("Headless is: " + program.headless)
console.log("Depth is: " + program.depth)
console.log("Year is: " + program.year)
const headless = program.headless === 'y'
const year = program.year

// 并发数，同时打开多个tabs
const concurrency = program.concurrency

async function run() {
  const browser = await puppeteer.launch({
    headless: headless,
    devtools: true
  })

  const page = await browser.newPage()

  await openPageWithAutoRetry(page, 'http://localhost:3000/admins/sign_in')
  
  // for province
  const provinces = await getProvinces(page)
  await saveProvinces(provinces)
  
  // for city
  // 遍历没有完成的省份，获取对应的城市列表
  const provincesWithoutFullCities = await getProvincesWithoutFullCities(year)
  let cities = []
  for (let i = 0; i < provincesWithoutFullCities.length; i += concurrency) {
    let promises = []
    for (let j = 0; j < concurrency && i+j < provincesWithoutFullCities.length; j++) {
      let province = provincesWithoutFullCities[i+j]
      console.log("(" + (i + j + 1) + "/" + provincesWithoutFullCities.length + ") Start to get cities of province " + province.name)
      promises.push(getAndSaveProvinceCities(browser, year, province))
    }
    const values = await mergePromises(promises)
    page.waitFor(500) // 等待，避免访问频繁被拦截

    cities = cities.concat(values)
  }
  console.log(cities)

  let districts = []
  let cityUrls = cities.map(city => city.url)
  for (const url of cityUrls) {
    await page.goto(url, {waitUntil: 'load', timeout: 0})
    const cityDistricts = await getDistricts(page)
    districts = districts.concat(cityDistricts)
  }

  console.log(districts)

  let towns = []
  let districtUrls = districts.map(district => district.url)
  for (const url of districtUrls) {
    await page.goto(url, {waitUntil: 'load', timeout: 0})
    const districtTowns = await getTowns(page)
    towns = towns.concat(districtTowns)
  }

  console.log(towns)
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

      province.url = provinceLinkElem.href
      province.name = provinceLinkElem.innerText
      province.code = urlParts[urlParts.length - 1].split('.')[0]
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
  const page = await browser.newPage()
  await page.goto(province.url, { waitUntil: 'load', timeout: 0 })
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
 * 获取区信息
 * @param  {page} 区所在的页面
 * @return {districts} 所有区  
 */
async function getDistricts(page) {
  const districts = await page.evaluate(() => {
    // 区页面里一层tr含有code、name两个a标签
    const districtTrElements = document.querySelectorAll('.countytr')

    const cityDistricts = Array.prototype.map.call(districtTrElements, districtTrElement => { 
      const districtLinkElements = districtTrElement.querySelectorAll('a')
      if(districtLinkElements.length > 0){
        let district = {}
        district.code = districtLinkElements[0].innerText
        district.name = districtLinkElements[1].innerText
        district.url = districtLinkElements[1].href
        return district
      }
      
    })
    return cityDistricts.filter(district => district != null)
  })
  
  return districts
}

/**
 * 获取镇（街道）信息
 * @param  {page} 镇所在的页面
 * @return {towns} 所有镇 
 */
async function getTowns(page) {
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
 * 保存指定省份的城市信息（只更新不存在的城市列表信息）
 * @param {Number} year 
 * @param {Province} province 
 * @param {Array} cities 
 */
async function saveProvinceCities(year, province, cities) {
  for await (const city of cities) {
    if (!await isRegionExist(City, year, city.code)) {
      let isCityInThisProvince = cities.some(item => item.code === city.code)
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
 * 打开页面，并且失败自动重试
 * @param {*} page 
 * @param {*} url 
 * @param {*} try_times 
 */
async function openPageWithAutoRetry(page, url, try_times = 0) {
  try {
    await page.goto(url, {waitUntil: 'load', timeout: 3000})
  } catch (ex) {
    if (try_times < 3) {
      try_times += 1
      page.waitFor(1000)
      console.warn("Retry to open page: " + url)
      return openPageWithAutoRetry(page, url, try_times)
    }
    throw ex
  }
}

run()
