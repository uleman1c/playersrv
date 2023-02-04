  var express = require('express');
  
  var sqlite3 = require('sqlite3').verbose();
  
  var uuid = require('uuid');

  const path = require('path')
  
  var db = new sqlite3.Database('player.db');
  
  var app = express();
  
  app.get('/create', function (req, res) {
  
    db.run('CREATE TABLE files (id TEXT not null, name TEXT not null, ext TEXT not null)', (err,rows) => {

        if (err) {
            
          res.send( err );
        } else {
            
          res.send( 'ok' );
        }

      });
  
  });
  
  app.get('/', function (req, res) {
  
        db.all(`SELECT * FROM files` , (err,rows) => {
  
          res.send( { rows: rows } );
      });
  
  });
  
app.get('/test', function (req, res) {
  
})

  app.get('/file', function (req, res) {
  
        db.prepare(`SELECT * FROM files where id = ?`)
            .all(req.query.id , (err,rows) => {
  

                let filespath = path.join(__dirname, "files", req.query.id + '.' + rows[0].ext)

                res.setHeader("Content-Type", "application/octet-stream")
                
                return res.download(filespath, encodeURIComponent(rows[0].name + '.' + rows[0].ext))
    
    

      });
  
  });
  
  app.get('/save', function (req, res) {
  
        let filename = req.query.filename.split('.')
        let ext = filename[filename.length - 1]
        filename.splice(filename.length - 1, 1)

        let name = filename.join('.')

      var stmt = db.prepare("INSERT INTO files VALUES (?, ?, ?)");
  
      stmt.run( uuid.v4(), name, ext , (err,rows) =>{
  
          res.send(true);
      });
  
      stmt.finalize();
  
  });
  
  app.listen( 3001, function () {
      console.log('Player server ready');
  });
  