var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var convertTimestamp = function (timestamp) {
    var d = new Date(timestamp),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2),
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2),
        ampm = 'AM',
        time;

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh === 0) {
        h = 12;
    }

    // ie: 2013-02-18, 8:35 AM
    time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

    return time;
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    } else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    } else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};

//</editor-fold>

app.controller('ScreenshotReportController', ['$scope', '$http', 'TitleService', function ($scope, $http, titleService) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;
    this.totalDurationFormat = clientDefaults.totalDurationFormat;
    this.showTotalDurationIn = clientDefaults.showTotalDurationIn;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime) {
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }


    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };
    this.hasNextScreenshot = function (index) {
        var old = index;
        return old !== this.getNextScreenshotIdx(index);
    };

    this.hasPreviousScreenshot = function (index) {
        var old = index;
        return old !== this.getPreviousScreenshotIdx(index);
    };
    this.getNextScreenshotIdx = function (index) {
        var next = index;
        var hit = false;
        while (next + 2 < this.results.length) {
            next++;
            if (this.results[next].screenShotFile && !this.results[next].pending) {
                hit = true;
                break;
            }
        }
        return hit ? next : index;
    };

    this.getPreviousScreenshotIdx = function (index) {
        var prev = index;
        var hit = false;
        while (prev > 0) {
            prev--;
            if (this.results[prev].screenShotFile && !this.results[prev].pending) {
                hit = true;
                break;
            }
        }
        return hit ? prev : index;
    };

    this.convertTimestamp = convertTimestamp;


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };

    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.totalDuration = function () {
        var sum = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.duration) {
                sum += result.duration;
            }
        }
        return sum;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };


    var results = [
    {
        "description": "Login as Customer|Banking Application Login Test--AS a Bank Manager",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "d1187b0e582dee4b23937fd26e1d7f9d",
        "instanceId": 11232,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00480029-008a-0063-0092-000d000b007e.png",
        "timestamp": 1624464875643,
        "duration": 3306
    },
    {
        "description": "Open Account Tab|Banking Application Login Test--AS a Bank Manager",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "d1187b0e582dee4b23937fd26e1d7f9d",
        "instanceId": 11232,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0096007b-00c7-006d-00a1-0093003f00dc.png",
        "timestamp": 1624464879650,
        "duration": 4673
    },
    {
        "description": "Customer Account Tab|Banking Application Login Test--AS a Bank Manager",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "d1187b0e582dee4b23937fd26e1d7f9d",
        "instanceId": 11232,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008e0083-00c1-0094-00d9-0051004d0043.png",
        "timestamp": 1624464884610,
        "duration": 2595
    },
    {
        "description": "GoogelHomePage|Googel Home Page Test",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "b49d517387affe6b54c48ad10e8da019",
        "instanceId": 11180,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d4007c-00c3-005c-0066-008100a900df.png",
        "timestamp": 1624467143832,
        "duration": 1782
    },
    {
        "description": "GoogelHomePage|Googel Home Page Test",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "2a17d07fe4a2f97d14e10557139b6e7a",
        "instanceId": 20260,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000900b2-003c-0077-00bb-008600be0077.png",
        "timestamp": 1624467200449,
        "duration": 7835
    },
    {
        "description": "GoogelHomePage|Googel Home Page Test",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "7fe42dc1d3e723d105e85f60e4bc1626",
        "instanceId": 4456,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f700f2-002c-00db-004a-00a800250057.png",
        "timestamp": 1624517937030,
        "duration": 7612
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "4e2f90bc170c950946d42e68edd6f289",
        "instanceId": 16332,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00850013-00c6-0031-0038-00b5005b0035.png",
        "timestamp": 1624518506259,
        "duration": 34
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "4e2f90bc170c950946d42e68edd6f289",
        "instanceId": 16332,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00fd00a6-0051-00a3-0049-004f0082009a.png",
        "timestamp": 1624518506596,
        "duration": 4
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "4e2f90bc170c950946d42e68edd6f289",
        "instanceId": 16332,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f300ad-0031-00bf-0098-007800f0001f.png",
        "timestamp": 1624518506740,
        "duration": 4
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "e78bb6c0789686ca770cb79b35a48e8a",
        "instanceId": 21996,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e000ba-004f-00aa-0096-00f700980055.png",
        "timestamp": 1624518688038,
        "duration": 17
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "e78bb6c0789686ca770cb79b35a48e8a",
        "instanceId": 21996,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004400dc-000a-00e6-004f-008300bd0017.png",
        "timestamp": 1624518688307,
        "duration": 4
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "e78bb6c0789686ca770cb79b35a48e8a",
        "instanceId": 21996,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "005d00d7-003b-0089-00ab-0090007000f1.png",
        "timestamp": 1624518688452,
        "duration": 4
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "8b9a9a5d21133e1052c417ea980afb9d",
        "instanceId": 7180,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "Expected NaN to be NaN."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:21:53)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "000100bf-00f5-005e-0070-001f0055002b.png",
        "timestamp": 1624518804395,
        "duration": 63
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "8b9a9a5d21133e1052c417ea980afb9d",
        "instanceId": 7180,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "Expected NaN to be NaN."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:21:53)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00930018-00be-00d8-002d-0080009a0043.png",
        "timestamp": 1624518804719,
        "duration": 5
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "8b9a9a5d21133e1052c417ea980afb9d",
        "instanceId": 7180,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "Expected NaN to be NaN."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:21:53)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00390042-0050-007b-008f-00a900ee0047.png",
        "timestamp": 1624518804872,
        "duration": 4
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "55f4f96bf112b8ed84076cebca944ea6",
        "instanceId": 22400,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "ReferenceError: userName is not defined"
        ],
        "trace": [
            "ReferenceError: userName is not defined\n    at UserContext.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:25:51)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ce0017-002c-00a3-0029-003700e400ca.png",
        "timestamp": 1624519491565,
        "duration": 27
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "55f4f96bf112b8ed84076cebca944ea6",
        "instanceId": 22400,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "ReferenceError: userName is not defined"
        ],
        "trace": [
            "ReferenceError: userName is not defined\n    at UserContext.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:25:51)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)"
        ],
        "browserLogs": [],
        "screenShotFile": "0066003d-0014-0010-00cc-0043000600db.png",
        "timestamp": 1624519491796,
        "duration": 8
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "55f4f96bf112b8ed84076cebca944ea6",
        "instanceId": 22400,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "ReferenceError: userName is not defined"
        ],
        "trace": [
            "ReferenceError: userName is not defined\n    at UserContext.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:25:51)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ba001e-0071-0094-00eb-004800c500bd.png",
        "timestamp": 1624519491951,
        "duration": 8
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "d14987485923912daa858b0118a3cb42",
        "instanceId": 18948,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "ReferenceError: userName is not defined"
        ],
        "trace": [
            "ReferenceError: userName is not defined\n    at UserContext.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:25:51)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a40040-00f3-0090-00cf-00ea008400de.png",
        "timestamp": 1624519560808,
        "duration": 38
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "d14987485923912daa858b0118a3cb42",
        "instanceId": 18948,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "ReferenceError: userName is not defined"
        ],
        "trace": [
            "ReferenceError: userName is not defined\n    at UserContext.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:25:51)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)"
        ],
        "browserLogs": [],
        "screenShotFile": "003600ab-0087-00fe-0086-008200a200f7.png",
        "timestamp": 1624519561077,
        "duration": 9
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "d14987485923912daa858b0118a3cb42",
        "instanceId": 18948,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "ReferenceError: userName is not defined"
        ],
        "trace": [
            "ReferenceError: userName is not defined\n    at UserContext.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:25:51)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e000e4-0092-0034-0079-0081002900fe.png",
        "timestamp": 1624519561226,
        "duration": 9
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "961d0d974d7e53e0e456b7f8994536a5",
        "instanceId": 1848,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "Failed: Angular could not be found on the page https://www.linkedin.com/login. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page https://www.linkedin.com/login. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:718:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: Run it(\"test {Regression} {Sanity} {Smoke}\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:18:9)\n    at addSpecsToSuite (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:959:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:995:10)\n    at Module.load (internal/modules/cjs/loader.js:815:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:727:14)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519587428,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=2r8IRZJXyoByU%2BT8p0PaqQ' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519588643,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519588995,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519588995,
                "type": ""
            }
        ],
        "screenShotFile": "00b60071-00e6-008f-00ef-00ad001100e9.png",
        "timestamp": 1624519586424,
        "duration": 12339
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "961d0d974d7e53e0e456b7f8994536a5",
        "instanceId": 1848,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "Failed: Angular could not be found on the page https://www.linkedin.com/login. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page https://www.linkedin.com/login. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:718:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: Run it(\"test {Regression} {Sanity} {Smoke}\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:18:9)\n    at addSpecsToSuite (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:959:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:995:10)\n    at Module.load (internal/modules/cjs/loader.js:815:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:727:14)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519599503,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=2r8IRZJXyoByU%2BT8p0PaqQ' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519599504,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519599504,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519599504,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519599699,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=3CLY1oqu4%2FOEPZJDXf1f0A' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519599890,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519601053,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519601054,
                "type": ""
            }
        ],
        "screenShotFile": "0048005c-00ff-0005-00be-0095004e0062.png",
        "timestamp": 1624519598972,
        "duration": 11057
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "961d0d974d7e53e0e456b7f8994536a5",
        "instanceId": 1848,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": [
            "Failed: Angular could not be found on the page https://www.linkedin.com/login. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page https://www.linkedin.com/login. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:718:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)\nFrom: Task: Run it(\"test {Regression} {Sanity} {Smoke}\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:18:9)\n    at addSpecsToSuite (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Admin\\Downloads\\Protractor_Automation_Framework_IBM\\DataDrivenTest_Excel\\DataDrivenTest.csv.spec.js:16:1)\n    at Module._compile (internal/modules/cjs/loader.js:959:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:995:10)\n    at Module.load (internal/modules/cjs/loader.js:815:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:727:14)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519610807,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=3CLY1oqu4%2FOEPZJDXf1f0A' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519610808,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519610808,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519610808,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519610904,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=VeIeTY4NJovqyHVMt8qKNg' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519611070,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519612235,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519612237,
                "type": ""
            }
        ],
        "screenShotFile": "00b700a6-00a9-0070-00d3-00d400770077.png",
        "timestamp": 1624519610254,
        "duration": 10932
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "46b59e816a2186348800325c0960ba5d",
        "instanceId": 21460,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519641003,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=2kJ3rTvKLRmH8Z6V9h9Akg' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519642159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519644288,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519644288,
                "type": ""
            }
        ],
        "screenShotFile": "000f005a-0098-005d-0077-00bb00dd0082.png",
        "timestamp": 1624519639981,
        "duration": 6437
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "46b59e816a2186348800325c0960ba5d",
        "instanceId": 21460,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519646860,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=hTLjT0gaec8%2FJBFoVvtB0g' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519647017,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519647846,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=Nyp9zpbX3e5R0AeXQIU8uQ' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519648009,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519650098,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519650098,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519652630,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=jlDwhK7I%2BAI3ROrxc0xMGQ' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519652800,
                "type": ""
            }
        ],
        "screenShotFile": "00fd00a6-0030-001b-0058-00210053006d.png",
        "timestamp": 1624519647196,
        "duration": 5561
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "46b59e816a2186348800325c0960ba5d",
        "instanceId": 21460,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519653404,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=nGqKeoD6aGYtYKjh0KoA5w' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519653536,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519655636,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519655636,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519658197,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=2SPbQQ3kzt3lq1f65HLw5Q' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519658368,
                "type": ""
            }
        ],
        "screenShotFile": "008d005e-0029-0045-0095-0090000000d8.png",
        "timestamp": 1624519652962,
        "duration": 5377
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "017d0f4bc649dea54d956be060d41237",
        "instanceId": 22028,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519710455,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=G3k5SwqLZrFELEubLxYVyQ' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519711706,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519713828,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519713828,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519716329,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=rUnIg4EX3eJm1PQ6JYzHMg' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519716531,
                "type": ""
            }
        ],
        "screenShotFile": "00580038-009d-00c0-00c3-007c00bc00c5.png",
        "timestamp": 1624519709607,
        "duration": 6869
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "017d0f4bc649dea54d956be060d41237",
        "instanceId": 22028,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519717143,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=r5KJ0cxW8Eb1X1sP%2FldtJA' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519717419,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519719565,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519719565,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519722049,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=H4wte1lfPBPQRNetV95QMA' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519722253,
                "type": ""
            }
        ],
        "screenShotFile": "00bc00ee-004b-006e-0010-0095000200f7.png",
        "timestamp": 1624519716772,
        "duration": 5438
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "017d0f4bc649dea54d956be060d41237",
        "instanceId": 22028,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519722902,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=OHE7Raj4H9WO1p%2B4YFqsDA' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519723075,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519725215,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519725215,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519727687,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=J3HHzQg4ZKFGdBKmTqfIDQ' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519727848,
                "type": ""
            }
        ],
        "screenShotFile": "000e00be-00e4-0053-00aa-0089007f0095.png",
        "timestamp": 1624519722474,
        "duration": 5335
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "017d0f4bc649dea54d956be060d41237",
        "instanceId": 22028,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519728351,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=eo8juJPBBqR%2B7DE9Eg1LVA' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519728483,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519730599,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519730599,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519733092,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=lrhVtcalUTNyuWkbCzumOw' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519733296,
                "type": ""
            }
        ],
        "screenShotFile": "0050009f-0010-00d8-0070-001e00d50086.png",
        "timestamp": 1624519728002,
        "duration": 5244
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "017d0f4bc649dea54d956be060d41237",
        "instanceId": 22028,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519733835,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=piSvURMtAmsIMSWlW6LW7w' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519733977,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519736105,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624519500000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624519736106,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624519738586,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=d2%2F7gngb21EYgJM8UAON8g' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624519738804,
                "type": ""
            }
        ],
        "screenShotFile": "0075008f-00fd-0040-009a-004800500069.png",
        "timestamp": 1624519733485,
        "duration": 5251
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "03fc17e4005229494769ece39f029533",
        "instanceId": 11212,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526592255,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=dtqht3E3tWt0pvz5aNnG6A' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526593968,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526594304,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526594304,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526599328,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=9mJ96RKQtpdx7hEYYW0HMA' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526599586,
                "type": ""
            }
        ],
        "screenShotFile": "00080029-0093-000c-009c-007100940013.png",
        "timestamp": 1624526591240,
        "duration": 8380
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "03fc17e4005229494769ece39f029533",
        "instanceId": 11212,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526600716,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=0FSbepd3e5x7DY9cXonwqA' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526600955,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526603092,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526603092,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526605950,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=d4wdr8YVbPIXTWI%2FIXZZkA' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526606209,
                "type": ""
            }
        ],
        "screenShotFile": "00d80064-00ed-008b-00d9-0087003000ae.png",
        "timestamp": 1624526599987,
        "duration": 6147
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "03fc17e4005229494769ece39f029533",
        "instanceId": 11212,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526607070,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=1cUXozMG33QTJ%2B%2B61Lu7Yg' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526607244,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526609395,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526609395,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526612304,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=A2oKZ%2BuSfRLZmbBlu76Hiw' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526612553,
                "type": ""
            }
        ],
        "screenShotFile": "00b10018-00d5-004f-00fe-00050062002a.png",
        "timestamp": 1624526606402,
        "duration": 6096
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "03fc17e4005229494769ece39f029533",
        "instanceId": 11212,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526613256,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=QXGlOyI0wXIN9%2FZ%2Bx2aY5A' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526613469,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526615653,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526615653,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526618279,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=QbYBxshooObAmbLAJRmlTw' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526618504,
                "type": ""
            }
        ],
        "screenShotFile": "009000cd-005e-00c7-00db-00c2004000e5.png",
        "timestamp": 1624526612774,
        "duration": 5680
    },
    {
        "description": "test {Regression} {Sanity} {Smoke}|Validate dfsfdsf 1 behaviour",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "03fc17e4005229494769ece39f029533",
        "instanceId": 11212,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526619395,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=nytIoJle%2BAmSbR279nYubA' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526619597,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 [Report Only] Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'sha256-THuVhwbXPeTR0HszASqMOnIyxqEgvGyBwSPBKBF/iMc=' 'sha256-iC8MPqNLw0FDnsBf4DlSkFLNTwhkI85aouiAEB819ic=' 'sha256-y5uW69VItKj51mcc7UD9qfptDVUqicZL+bItEpvVNDw=' 'sha256-PyCXNcEkzRWqbiNr087fizmiBBrq9O6GGD8eV3P09Ik=' 'sha256-2SQ55Erm3CPCb+k03EpNxU9bdV3XL9TnVTriDs7INZ4=' 'sha256-S/KSPe186K/1B0JEjbIXcCdpB97krdzX05S+dHnQjUs=' platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526621763,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.linkedin.com/litms/utag/checkpoint-frontend/utag.js?cb=1624526400000 0 Refused to load the script 'https://www.googletagmanager.com/gtag/js?id=AW-979305453' because it violates the following Content Security Policy directive: \"script-src 'report-sample' 'unsafe-inline' 'unsafe-eval' 'self' spdy.linkedin.com static-src.linkedin.com *.ads.linkedin.com *.licdn.com static.chartbeat.com www.google-analytics.com ssl.google-analytics.com bcvipva02.rightnowtech.com www.bizographics.com sjs.bizographics.com js.bizographics.com d.la4-c1-was.salesforceliveagent.com https://snap.licdn.com/li.lms-analytics/ platform.linkedin.com platform-akam.linkedin.com platform-ecst.linkedin.com platform-azur.linkedin.com\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1624526621763,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://static-exp1.licdn.com/sc/h/6jblk5oqhlo45xbkmcr7s4zix 0 RTP data channels are no longer supported. The \"RtpDataChannels\" constraint is currently ignored, and may cause an error at a later date.",
                "timestamp": 1624526624484,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "/_/gsi/_/js/k=gsi.gsi.en.2f0d9inoam4.O/am=cg/d=1/ct=zgms/rs=AF0KOtW8IEF-TGSiZ5fJdPlfbYNG4zpbRg/m=gis_client_library 567 [Report Only] Refused to connect to 'https://accounts.google.com/gsi/status?client_id=990339570472-k6nqn1tpmitg8pui82bfaun3jrpmiuhs.apps.googleusercontent.com&as=ccYMvr46Pg5bZEQDVgR0wA' because it violates the following Content Security Policy directive: \"connect-src 'self' www.linkedin.com www.google-analytics.com https://dpm.demdex.net/id lnkd.demdex.net blob: https://linkedin.sc.omtrdc.net/b/ss/ static.licdn.com static-exp1.licdn.com static-exp2.licdn.com static-exp3.licdn.com\".\n",
                "timestamp": 1624526624778,
                "type": ""
            }
        ],
        "screenShotFile": "00ce0007-00df-0083-0094-00c100d10073.png",
        "timestamp": 1624526618731,
        "duration": 5981
    },
    {
        "description": "GoogelHomePage|Googel Home Page Test",
        "passed": true,
        "pending": false,
        "os": "windows",
        "sessionId": "057fe5d9a910fb4f03658a7cd50eac83",
        "instanceId": 22804,
        "browser": {
            "name": "chrome",
            "version": "91.0.4472.114"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0068009c-002a-007f-0088-00fc00b20014.png",
        "timestamp": 1624526802529,
        "duration": 7995
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});

    };

    this.setTitle = function () {
        var title = $('.report-title').text();
        titleService.setTitle(title);
    };

    // is run after all test data has been prepared/loaded
    this.afterLoadingJobs = function () {
        this.sortSpecs();
        this.setTitle();
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    } else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.afterLoadingJobs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.afterLoadingJobs();
    }

}]);

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

//formats millseconds to h m s
app.filter('timeFormat', function () {
    return function (tr, fmt) {
        if(tr == null){
            return "NaN";
        }

        switch (fmt) {
            case 'h':
                var h = tr / 1000 / 60 / 60;
                return "".concat(h.toFixed(2)).concat("h");
            case 'm':
                var m = tr / 1000 / 60;
                return "".concat(m.toFixed(2)).concat("min");
            case 's' :
                var s = tr / 1000;
                return "".concat(s.toFixed(2)).concat("s");
            case 'hm':
            case 'h:m':
                var hmMt = tr / 1000 / 60;
                var hmHr = Math.trunc(hmMt / 60);
                var hmMr = hmMt - (hmHr * 60);
                if (fmt === 'h:m') {
                    return "".concat(hmHr).concat(":").concat(hmMr < 10 ? "0" : "").concat(Math.round(hmMr));
                }
                return "".concat(hmHr).concat("h ").concat(hmMr.toFixed(2)).concat("min");
            case 'hms':
            case 'h:m:s':
                var hmsS = tr / 1000;
                var hmsHr = Math.trunc(hmsS / 60 / 60);
                var hmsM = hmsS / 60;
                var hmsMr = Math.trunc(hmsM - hmsHr * 60);
                var hmsSo = hmsS - (hmsHr * 60 * 60) - (hmsMr*60);
                if (fmt === 'h:m:s') {
                    return "".concat(hmsHr).concat(":").concat(hmsMr < 10 ? "0" : "").concat(hmsMr).concat(":").concat(hmsSo < 10 ? "0" : "").concat(Math.round(hmsSo));
                }
                return "".concat(hmsHr).concat("h ").concat(hmsMr).concat("min ").concat(hmsSo.toFixed(2)).concat("s");
            case 'ms':
                var msS = tr / 1000;
                var msMr = Math.trunc(msS / 60);
                var msMs = msS - (msMr * 60);
                return "".concat(msMr).concat("min ").concat(msMs.toFixed(2)).concat("s");
        }

        return tr;
    };
});


function PbrStackModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    ctrl.convertTimestamp = convertTimestamp;
    ctrl.isValueAnArray = isValueAnArray;
    ctrl.toggleSmartStackTraceHighlight = function () {
        var inv = !ctrl.rootScope.showSmartStackTraceHighlight;
        ctrl.rootScope.showSmartStackTraceHighlight = inv;
    };
    ctrl.applySmartHighlight = function (line) {
        if ($rootScope.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return '';
    };
}


app.component('pbrStackModal', {
    templateUrl: "pbr-stack-modal.html",
    bindings: {
        index: '=',
        data: '='
    },
    controller: PbrStackModalController
});

function PbrScreenshotModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;

    /**
     * Updates which modal is selected.
     */
    this.updateSelectedModal = function (event, index) {
        var key = event.key; //try to use non-deprecated key first https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/keyCode
        if (key == null) {
            var keyMap = {
                37: 'ArrowLeft',
                39: 'ArrowRight'
            };
            key = keyMap[event.keyCode]; //fallback to keycode
        }
        if (key === "ArrowLeft" && this.hasPrevious) {
            this.showHideModal(index, this.previous);
        } else if (key === "ArrowRight" && this.hasNext) {
            this.showHideModal(index, this.next);
        }
    };

    /**
     * Hides the modal with the #oldIndex and shows the modal with the #newIndex.
     */
    this.showHideModal = function (oldIndex, newIndex) {
        const modalName = '#imageModal';
        $(modalName + oldIndex).modal("hide");
        $(modalName + newIndex).modal("show");
    };

}

app.component('pbrScreenshotModal', {
    templateUrl: "pbr-screenshot-modal.html",
    bindings: {
        index: '=',
        data: '=',
        next: '=',
        previous: '=',
        hasNext: '=',
        hasPrevious: '='
    },
    controller: PbrScreenshotModalController
});

app.factory('TitleService', ['$document', function ($document) {
    return {
        setTitle: function (title) {
            $document[0].title = title;
        }
    };
}]);


app.run(
    function ($rootScope, $templateCache) {
        //make sure this option is on by default
        $rootScope.showSmartStackTraceHighlight = true;
        
  $templateCache.put('pbr-screenshot-modal.html',
    '<div class="modal" id="imageModal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="imageModalLabel{{$ctrl.index}}" ng-keydown="$ctrl.updateSelectedModal($event,$ctrl.index)">\n' +
    '    <div class="modal-dialog modal-lg m-screenhot-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="imageModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="imageModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <img class="screenshotImage" ng-src="{{$ctrl.data.screenShotFile}}">\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <div class="pull-left">\n' +
    '                    <button ng-disabled="!$ctrl.hasPrevious" class="btn btn-default btn-previous" data-dismiss="modal"\n' +
    '                            data-toggle="modal" data-target="#imageModal{{$ctrl.previous}}">\n' +
    '                        Prev\n' +
    '                    </button>\n' +
    '                    <button ng-disabled="!$ctrl.hasNext" class="btn btn-default btn-next"\n' +
    '                            data-dismiss="modal" data-toggle="modal"\n' +
    '                            data-target="#imageModal{{$ctrl.next}}">\n' +
    '                        Next\n' +
    '                    </button>\n' +
    '                </div>\n' +
    '                <a class="btn btn-primary" href="{{$ctrl.data.screenShotFile}}" target="_blank">\n' +
    '                    Open Image in New Tab\n' +
    '                    <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>\n' +
    '                </a>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

  $templateCache.put('pbr-stack-modal.html',
    '<div class="modal" id="modal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="stackModalLabel{{$ctrl.index}}">\n' +
    '    <div class="modal-dialog modal-lg m-stack-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="stackModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="stackModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <div ng-if="$ctrl.data.trace.length > 0">\n' +
    '                    <div ng-if="$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer" ng-repeat="trace in $ctrl.data.trace track by $index"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                    <div ng-if="!$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in $ctrl.data.trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                </div>\n' +
    '                <div ng-if="$ctrl.data.browserLogs.length > 0">\n' +
    '                    <h5 class="modal-title">\n' +
    '                        Browser logs:\n' +
    '                    </h5>\n' +
    '                    <pre class="logContainer"><div class="browserLogItem"\n' +
    '                                                   ng-repeat="logError in $ctrl.data.browserLogs track by $index"><div><span class="label browserLogLabel label-default"\n' +
    '                                                                                                                             ng-class="{\'label-danger\': logError.level===\'SEVERE\', \'label-warning\': logError.level===\'WARNING\'}">{{logError.level}}</span><span class="label label-default">{{$ctrl.convertTimestamp(logError.timestamp)}}</span><div ng-repeat="messageLine in logError.message.split(\'\\\\n\') track by $index">{{ messageLine }}</div></div></div></pre>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <button class="btn btn-default"\n' +
    '                        ng-class="{active: $ctrl.rootScope.showSmartStackTraceHighlight}"\n' +
    '                        ng-click="$ctrl.toggleSmartStackTraceHighlight()">\n' +
    '                    <span class="glyphicon glyphicon-education black"></span> Smart Stack Trace\n' +
    '                </button>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

    });
