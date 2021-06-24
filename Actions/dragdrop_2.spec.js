const { browser, element, by } = require("protractor")

describe("Actions", () => {

    beforeAll(async () => {
        browser.waitForAngularEnabled(false)
        await browser.get("https://jqueryui.com/droppable/");
        browser.manage().window().maximize()
    })

    it("Drag and Drop Test", async () => {
        await browser.switchTo().frame(0);
        let source = await element(by.css('#draggable'));
        let target = await element(by.css('#droppable'));

        await browser.actions().dragAndDrop(await source.getWebElement(), await target.getWebElement()).perform();



    })


    afterAll(async () => {
        await browser.sleep(5000);
    })
})