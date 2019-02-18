const puppeteer = require('puppeteer')

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  })

  const page = await browser.newPage()

  await page.goto('http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/index.html', {waitUntil: 'load', timeout: 0})
  
  const provinces = await getProvinces(page)
  console.log(provinces.map(province => province.name))
  let provinceUrls = provinces.map(province => province.url)

  let cities = []
  for (const url of provinceUrls) {
    await page.goto(url, {waitUntil: 'load', timeout: 0})
    const provinceCities = await getCities(page)
    cities = cities.concat(provinceCities)
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

  saveProvinces(provinces)
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
 * @param  {page} 城市所在的页面
 * @return {cities} 所有城市  
 */
async function getCities(page) {
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
  
  return cities
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

/**
 * 保存信息到数据库
 * @param  {provices} 省份列表
 */
function saveProvinces(provinces) {
  
}

run()
