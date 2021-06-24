
describe('smokeTest', function(){

    it('MultipleElement', async function(){

        await browser.waitForAngularEnabled(false);
        await browser.get("https://www.google.com/");
        await browser.switchTo().activeElement().sendKeys("cricket", protractor.Key.ENTER);
        let crickets = element.all(by.xpath("//*[contains(text(),'cricket') or contains(text(),'Cricket')]"))
        let count = await crickets.count();
        console.log(count);
    
    })


})