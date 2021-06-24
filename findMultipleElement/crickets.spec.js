// import { FindCrickets } from './FindCrickets';
// import { browser } from 'protractor';
const { FindCrickets } = require('./FindCrickets')
describe('Find no.of crickets', () => {

    it('Find crickets', async () => {
        await FindCrickets.getCricketsWord();
    });
})