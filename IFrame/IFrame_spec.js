const { browser, element } = require("protractor")

describe('Handle Iframe- non Angular Application', () => {


    beforeAll(() => {
        
        //Handle non- Angular applicaiton
        browser.waitForAngularEnabled(false)
        browser.get('https://paytm.com/')
        browser.manage().window().maximize()

    })

    afterEach(() => {
        browser.sleep(4000)

    })
    it('Handle Iframe', async function () {

        element(by.css("._3ac-")).click();
        //Generate Iframe, perform action on iframe
        //frame - switch using index
        browser.switchTo().frame(0)
        let header = await element(by.css(".heading")).getText();
        console.log(header);
        element(by.xpath("//span[@class='ng-scope']")).click();


    })



})