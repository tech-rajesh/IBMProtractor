var Request = require("request");
describe("Errors in Protractor", function () {
  browser.ignoreSynchronization = true; // for non-angular websites
  it("api Testing in protractor", function (done) {

    Request.put({
      "headers": { "content-type": "application/json" },
      "url": "https://chercher.tech/sample/api/product/create",
      "body": JSON.stringify({
        "name": "some stupid guy",
        "description": "90033"
      })

    }, (error, response, body) => {
      if (error) {
        return console.dir(error);
      }
      console.dir("Body : ******");
      console.dir(response.body);
      
      console.log("Header ****:")
      console.log(response.headers)

      // this below line took half day of research
      done();
    });
  });
});