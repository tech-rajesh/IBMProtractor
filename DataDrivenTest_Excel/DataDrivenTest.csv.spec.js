'use strict';
//use fs to read file
let fs = require('fs');
//use csv-parse sync to parse the file : https://csv.js.org/parse/
const parse = require('csv-parse/lib/sync');
const { DriverProvider } = require('protractor/built/driverProviders');
const { browser } = require('protractor');
//read the csv file
let a = fs.readFileSync('DataDrivenTest_Excel/TestData.csv');
//parse the csv file
const testdata = parse(a, {
    columns: true,
    skip_empty_lines: true
})
console.log(testdata);
describe('Validate dfsfdsf 1 behaviour', function () {
    for (let i of testdata) {		
        it('test {Regression} {Sanity} {Smoke}', async function () {
			console.log(i);
            console.log(i.userName);
            console.log(i.password);
            console.log(i.company);

            browser.waitForAngularEnabled(false)
            browser.get('https://www.linkedin.com/login')
            element(by.css("#username")).sendKeys(i.userName)
            browser.sleep(2000)
            element(by.css("#password")).sendKeys(i.password)
            browser.sleep(2000)
            browser.refresh();
        });
    }
});