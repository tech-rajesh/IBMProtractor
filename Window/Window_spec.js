const { browser, element } = require("protractor")

describe('Handle Iframe- non Angular Application', () => {


    beforeAll(async () => {
        
        //Handle non- Angular applicaiton
        browser.waitForAngularEnabled(false)
        await browser.get('https://paytm.com/')
        browser.manage().window().maximize()

    })

    afterEach(() => {
        browser.sleep(4000)

    })
    it('Switch to New Window', async function () {

        //open a new Tab
        
        
        let parentWindow = browser.getWindowHandle();
        console.log(await browser.getTitle());
        await element(by.xpath("//span[text()='Paytm Service Agent']")).click();
        let wins = await browser.getAllWindowHandles();
        console.log(wins);
        console.log(wins.length);
        await browser.switchTo().window(wins[1])
        console.log(await browser.getTitle());
        await browser.sleep(5000)

        await element(by.css("#headerApplyBtn")).click();
        await browser.sleep(5000)
        await browser.switchTo().window(parentWindow)

    })



})