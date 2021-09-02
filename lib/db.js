const mysql = require('mysql');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'cemaco_test'
});
connection.connect((err) => {
    if (err) throw err;
    console.log('Database is connected successfully!');
});
module.exports = connection;