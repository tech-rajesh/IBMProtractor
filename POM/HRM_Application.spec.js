const { browser, element, by } = require("protractor")

describe('HRM application', ()=>{

it('verify title',()=>{


    browser.get('https://opensource-demo.orangehrmlive.com/index.php');
    element(by.css("input#txtUsername")).sendKeys('Admin')
    element(by.css("input#txtPassword")).sendKeys('admin123')
    element(by.css("input#btnLogin")).click();

    element(by.xpath("//a[contains(text(),'Forgot')]")).click();


})

})