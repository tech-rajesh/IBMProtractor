describe('MYSQL Test', function() {
    function ConnectDatabase(){
        var mysql = require("mysql")
        this.connection = mysql.createConnection({
            host:"localhost:3306",
            user:"root",
            password:"root",
            database:"myflixdb"
        })
    }
    fit('DataBase testing in Protractor', function(done) {
        var connectDatabase = new ConnectDatabase()
        connectDatabase.connection.connect();
        var sql = "SELECT * FROM categories;"
        connectDatabase.connection.query(sql, function(err, rows){
            if(err){
                console.log(err)
            }else{
                // console.log(JSON.stringify(rows))

                Object.keys(rows).forEach(function(keyItem){
                    var row = rows[keyItem]
                    console.log(row.category_id +" "+ row.category_name)
                })
            }
            connectDatabase.connection.end()
            done()
        })
    });
});