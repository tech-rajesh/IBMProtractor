// --------------------------------------------------
// spec/integration/wikipedia.service.spec.js
// --------------------------------------------------
 
const frisby = require('frisby');
 
describe("English Wikipedia REST API", function() {
 
  const ENV = require("./env.json");
  const BASE_URL = ENV.integration.wikipediaServiceBaseUrl;
 
  describe("GET /page/summary/{title}", function() {
 
    it("should return the summary for the given page title", function(done) {
      frisby
        .get(BASE_URL + "/page/summary/Pikachu")
        .then(function(response) {
          expect(response.status).toBe(200);
          expect(response.json.title).toBe("Pikachu");
          expect(response.json.pageid).toBe(269816);
          expect(response.json.extract).toContain("Pokémon");
        })
        .done(done);
    })
 
  });
 
  // ...
});