const { browser, element } = require("protractor")

describe('Handle dropdown- non Angular Application', () => {


    beforeAll(async () => {
        
        //Handle non- Angular applicaiton
        browser.waitForAngularEnabled(false)
        await browser.get('https://paytm.com/')
        browser.manage().window().maximize()

    })

    afterEach(() => {
        browser.sleep(4000)

    })
    it('Select your Automation type', async () => {

        await browser.get("https://www.testandquiz.com/selenium/testing.html");
        // let select = await $("#Index");
        await browser.sleep(3000)
        await element(by.cssContainingText('option', 'Performance Testing')).click()
        await browser.sleep(5000)
    })

    it('Semantic UI dropdown', async () => {
        await browser.waitForAngularEnabled(false);
        await browser.get("https://semantic-ui.com/modules/dropdown.html");
        await $('.ui.selection.dropdown').click();
        await browser.sleep(5000)
        await element(by.cssContainingText('div.item', 'Female')).click();
    })



})