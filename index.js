const puppeteer = require('puppeteer')

async function run() {
  const browser = await puppeteer.launch({
    headless: false
  })

  const page = await browser.newPage()

  await page.goto('https://github.com/login')

  const provinces = await getProvinces(page)
  console.log(provinces)
  saveProvinces(provinces)
}

/**
 * 获取省份信息
 * @param  {page} 省份所在的页面
 * @return {provinces} 所有省份   
 */
async function getProvinces(page) {
  return null
}

/**
 * 保存信息到数据库
 * @param  {provices} 省份列表
 */
function saveProvinces(provinces) {
  
}

run()
