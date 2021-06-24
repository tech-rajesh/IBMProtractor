// import { element, by, browser, $ } from "protractor";

describe('Interact with buttons', () => {

    beforeAll(async () => {
        // console.log(await browser.getCapabilities());
        browser.waitForAngularEnabled(false)
        await browser.get('https://in.godaddy.com/')
    })
    it('Protractor specific locator', async () => {
        let text = await element(by.xpath("//a[contains(.,'Get It Now')]")).getText()
        console.log(text);
    });

    it('Get Position', async () => {
        // element(by.id())
        let location = await element(by.xpath("//div[@class='right fos']//a[contains(.,'Learn More')]")).getLocation()
        console.log(location.x);
        console.log(location.y);
    });

    it('Button color', async () => {
        let color = await $('.searchText').getCssValue('background-color')
        console.log(color);
    });

    it('Find the height and width', async () => {
        let size = await $('.searchText').getSize()
        console.log(size.height);
        console.log(size.width);
    });
})