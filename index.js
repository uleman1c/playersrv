/**
   * First, include the two previously installed modules 
   */
  var express = require('express');
  
  var sqlite3 = require('sqlite3').verbose();
  
  var uuid = require('uuid');
  
  /**
   * At this point create a database in memory ( i.e. 
   * not saving it on disk ) where to save your
   * our data


   */
  var db = new sqlite3.Database('player.db');
  
  /**
   * Then create a new table with only two fields: 
   * - title : Book title
   * - author : Full name of the author
   */
  //db.run("CREATE TABLE books (title TEXT, author TEXT)");
  
  /**
   * Initialize a new express application
   */
  var app = express();
  
  /**
   * Use the main server root to
   * list all the books 
   */
  app.get('/create', function (req, res) {
  
    db.run('CREATE TABLE files (id TEXT not null, name TEXT not null, ext TEXT not null)', (err,rows) => {

        if (err) {
            
          res.send( err );
        } else {
            
          res.send( 'ok' );
        }

        // 'SELECT name FROM sqlite_master WHERE type=\'table\''
      //db.all(`SELECT * FROM files` , (err,rows) => {
  
          /**
           * Send all the lines in the “book” table
           */
      });
  
  });
  
  app.get('/', function (req, res) {
  
        db.all(`SELECT * FROM files` , (err,rows) => {
  
          /**
           * Send all the lines in the “book” table
           */
          res.send( rows );
      });
  
  });
  
  /**
   * Use this path to save, instead:
   * /save/ followed by title and author
   */
  app.get('/save', function (req, res) {
  
        let filename = req.query.filename.split('.')
        let ext = filename[filename.length - 1]
        filename.splice(filename.length - 1, 1)

        let name = filename.join('.')

      /**
       * Prepare the INSERT instruction in our table 
       */
      var stmt = db.prepare("INSERT INTO files VALUES (?, ?, ?)");
  
      /**
       * And run the query above, moving the data in the url
       * nell url 
       */
      stmt.run( uuid.v4(), name, ext , (err,rows) =>{
  
          /**
           * Finally, send a ‘true’  status to show that 
           * saving has been successful
           */
          res.send(true);
      });
  
      stmt.finalize();
  
  });
  
  /**
   * Therefore , run the listen server on port 80 
   */
  
  app.listen( 3001, function () {
      console.log('Player server ready');
  });
  