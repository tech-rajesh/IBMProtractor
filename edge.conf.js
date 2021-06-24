exports.config = {
    framework: 'jasmine',
    // directConnect: true,
    seleniumAddress: "http://localhost:4444/wd/hub",
    specs: ['interactWithButtons/buttons.spec.js', 'InputBox/InputBox_spec.js'],
    SELENIUM_PROMISE_MANAGER: false,
    jasmineNodeOpts: {
        defaultTimeoutInterval: 60000
    },
    capabilities: {
        "browserName": "MicrosoftEdge",
    }
}

// -Dwebdriver.edge.driver=msedgedriver.exe