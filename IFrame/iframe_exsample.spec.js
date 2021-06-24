const { browser } = require("protractor")

describe('Example Iframe', ()=>
{




    it('Login',async ()=>{
        //waiting for Angular - false or off
        browser.waitForAngularEnabled(false)
        browser.manage().window().maximize()
        await browser.get("https://paytm.com")
        // await browser.sleep(5000)
        var EC = protractor.ExpectedConditions;
        // Waits for the element with id 'abc' to be clickable.
        browser.wait(EC.elementToBeClickable($('._3ac-')), 5000);
        //await $('._3ac-').click()
        //await element(by.css('._3ac-')).click()
        await element(by.xpath("//div[@class='_3ac-']")).click()
        browser.sleep(1000)
        await browser.switchTo().frame(0)
        //await browser.switchTo().frame(0)
        // expect($('.heading').getText()).toBe('To Login into your Paytm Web account')
        // $('.heading').getText()).toBe('To Login into your Paytm Web account')
        let header = await $('.heading').getText();
        console.log('========='+ header);



    })






})