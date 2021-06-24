var object = require('./ObjectRepository.json');

describe('Banking Application Login Test--AS a Bank Manager', function () {
    it('Login as Customer', function () {

        browser.get(object.TestUrl);
        browser.driver.manage().window().maximize();
        element(by.buttonText(object.Locators.BankManagerLoginButton)).click();
        element(by.buttonText(object.Locators.AddCustomerButon)).click();
        element(by.model(object.Locators.CustomerFirstName)).sendKeys("Test customer 1");
        element(by.model(object.Locators.CustomerLastName)).sendKeys("JIO");
        element(by.model(object.Locators.Pincode)).sendKeys("400708");
        element(by.className(object.Locators.AddCustomerButonDown)).click();
        browser.sleep(1000);
        var alt = browser.switchTo().alert().getText();
        expect(alt).toEqual('Customer added successfully with customer id :6');

        browser.switchTo().alert().accept();
        console.log("Alert Accepted Sucesfully")

    });

    it('Open Account Tab', function () {


        element(by.buttonText(object.Locators.OpenAccountButton)).click();
        element(by.model(object.Locators.SelectCustomer)).click();
        browser.sleep(2000);
        element(by.xpath(object.Locators.Selectoption)).click();

        element(by.id(object.Locators.Selectcurrency)).sendKeys("Rupee");
        browser.sleep(1000);
        element(by.buttonText(object.Locators.ProcessButton)).click();
        browser.sleep(1000);
        var alt = browser.switchTo().alert().getText();
        expect(alt).toEqual('Account created successfully with account Number :1016');
        browser.switchTo().alert().accept();

    });

    it('Customer Account Tab', function () {

        element(by.buttonText('Customers')).click();
        element(by.model('searchCustomer')).sendKeys("Test customer 1");
        browser.sleep(2000);
        element(by.buttonText('Delete')).click();
        element(by.buttonText('Home')).click();



    });

});