const { browser } = require("protractor")

describe('Interact with Alert', () => {
    beforeAll(async () => {
        browser.waitForAngularEnabled(false)
        await browser.get('http://only-testing-blog.blogspot.com/2013/11/new-test.html')
    })
    afterAll(async () => {
        await browser.quit()
    })
    it('Simple Alert', async () => {
        await element(by.css("[onclick='myFunction1()']")).click();
        // console.log(await browser.getTitle());
        await browser.sleep(3000);
        (await browser.switchTo().alert()).accept()
    });

    it('Confirm Alert', async () => {
        await element(by.buttonText('Show Me Confirmation')).click();
        await browser.sleep(3000);
        console.log(await (await browser.switchTo().alert()).getText());
        (await browser.switchTo().alert()).accept();
        expect(await element(by.css("#demo")).getText()).toBe('You pressed OK!')
    });

    it('Prompt Alert', async () => {
        await element(by.buttonText('Show Me Prompt')).click()
        await browser.sleep(3000);
        let alert = await browser.switchTo().alert();
        await alert.sendKeys("Rajesh Singh");
        await browser.sleep(3000);
        await alert.accept();
    });

    // it('Sweet Alert', async () => {
    //     await element(by.buttonText('Sweet')).click();
    //     await browser.sleep(2000)
    //     await element(by.buttonText('OK')).click();
    // });
})