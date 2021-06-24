const {createPool} = require('mysql')

const pool = createPool({
    host:"localhost",
    user:"root",
    password:"",
    database:"myflixdb",
    connectionLimit: 10
})


pool.query('SELECT * FROM categories;', function(err, result, fields) {
    if (err) {
        return console.log(err);
    }
    return console.log(result);
})