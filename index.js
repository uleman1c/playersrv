  var express = require('express');
  
  var sqlite3 = require('sqlite3').verbose();
  
  var uuid = require('uuid');
  var bodyParser = require('body-parser')
  var cors = require('cors')
  const path = require('path')
  
  var db = new sqlite3.Database('player.db');

  var fs = require('fs')
  
  var app = express();
  
  app.use(cors())
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
  app.use(bodyParser.json({limit: '50mb'}))
  app.use(bodyParser.raw({limit: '50mb'}))

  app.get('/create', function (req, res) {
  
    let sqltext = 'CREATE TABLE requests (id TEXT not null, date TEXT not null, appid TEXT not null, addr TEXT not null, body TEXT not null)'
    //let sqltext = 'CREATE TABLE files (id TEXT not null, name TEXT not null, ext TEXT not null)'

    db.run(sqltext, (err,rows) => {

        if (err) {
            
          res.send( err );
        } else {
            
          res.send( 'ok' );
        }

      });
  
  });
  
  function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    while (0 !== currentIndex) {
  
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
  }

  function sendRowsOrErr(res, err,rows) {
          if (err) {
            
            res.send( { err: err } );
          } else {
            
            res.send( { rows: shuffle(rows) } );
          }
  
    
  }

  app.get('/', function (req, res) {
  
    if (req.query.style) {
      
        db.all('SELECT * FROM files where style = ? limit 100 ', [req.query.style] , (err,rows) => { sendRowsOrErr(res, err, rows) });
  
    } else {
      
        db.all(`SELECT * FROM files limit 100`, [], (err,rows) => { sendRowsOrErr(res, err, rows) });
  
    }

  });
  
app.post('/files', function (req, res) {

  saveRequest(req, () => {
    
    let jb = res.body

    let limit = jb && jb.limit ? jb.limit : 100

    let arWhere = jb && jb.where ? jb.where : []
    let arOrder = jb && jb.order ? jb.order : []

    let strWhere = arWhere.length > 0 ? 'where ' + arWhere.join( ' and ' ) : ''
    let strOrder = arOrder.length > 0 ? 'order by ' + arOrder.join( ' , ' ) : ''

    let sqltext = 'SELECT * FROM files ' + strWhere + ' ' + strOrder + ' limit ' + limit

    let params = jb && jb.params ? jb.params : []

    dball(sqltext, params, rows => { 
      
      res.send( { result: true, rows: rows } ) 

    }, err => { res.send( { result: false, error: err } ) } )

  }, err => { res.send( { result: false, error: err } ) } )



/*   if (req.query.style) {
    
      db.all('SELECT * FROM files where style = ? limit 100 ', [req.query.style] , (err,rows) => { sendRowsOrErr(res, err, rows) });

  } else {
    
      db.all(`SELECT * FROM files limit 100`, [], (err,rows) => { sendRowsOrErr(res, err, rows) });

  }
 */
});
  
function readCatalog(mFiles, curPath, curCat) {
  
  let filespath = path.join(curPath, curCat)

  const dirEntries = fs.readdirSync(filespath, {withFileTypes: true})

    dirEntries.forEach(element => {

      if (element.isDirectory()) {
        
        readCatalog(mFiles, filespath, element.name)

      } else {


        let filename = element.name.split('.')
        let ext = filename[filename.length - 1]
        filename.splice(filename.length - 1, 1)

        let name = filename.join('.')

        mFiles.push({ name: name, ext: ext, style: curCat, path: filespath })
      }


      
    });
}

function addFileToBase(mFiles, index, callback, callbackerror) {

  if (index < mFiles.length) {
    
      let curFile = mFiles[index]

      db.prepare(`SELECT id FROM files where id = ?`)
        .all(curFile.name, (err,rows) => {

          if (err) {

            callbackerror( err )
            
          } else {

            if (rows.length == 0) {

              let curId = uuid.v4()

              db.prepare("INSERT INTO files VALUES (?, ?, ?, ?, ?)")
                .run(curId, curFile.name, curFile.ext, curFile.style, '', (err,rows) =>{
          
                  if (err) {
                    
                    callbackerror( err )
                    
                  } else {

                    fs.renameSync(path.join(curFile.path, curFile.name + '.' + curFile.ext), path.join(__dirname, "files", curId + '.' + curFile.ext));

                    addFileToBase(mFiles, index + 1, callback, callbackerror) 
                    
                  }

                }).finalize();              

              
            } else {

              addFileToBase(mFiles, index + 1, callback, callbackerror)

            }
            
          }

        })

  } else {
    
    callback()
  
  }
  
}

function dateToObjDateTime(date) {
    
  var year = date.getFullYear();
  var month = date.getMonth() + 1; // getMonth() is zero-based
  var day = date.getDate();
  var hour = date.getHours();
  var minute = date.getMinutes();
  var second = date.getSeconds();

  var strMonth = (month < 10 ? '0' : '') + String(month)
  var strDay = (day < 10 ? '0' : '') + String(day)
  var strHour = (hour < 10 ? '0' : '') + String(hour)
  var strMinute = (minute < 10 ? '0' : '') + String(minute)
  var strSecond = (second < 10 ? '0' : '') + String(second)

  return { year: String(year), month: strMonth, day: strDay, hour: strHour, minute: strMinute, second: strSecond}

}

function dateToYMDHMS(date) {

  var dataobj = dateToObjDateTime(date)

  return dataobj.year + dataobj.month + dataobj.day + dataobj.hour + dataobj.minute + dataobj.second
  
}




app.get('/test', function (req, res) {
  
  

  /*   let filespath = path.join(__dirname, "files")
  
    let mFiles = []
  
    readCatalog(mFiles, filespath, '')
  
    addFileToBase(mFiles, 0, () => { res.send( mFiles ) }, err => { res.send( err ) })
   */ 
  /*
      let sqltext = 'select * from requests'
       db.all(sqltext, (err,rows) => {
  
          if (err) {
              
            res.send( err );
          } else {
              
            res.send( rows );
          }
  
        });
  */
  
    
    //let sqltext = 'ALTER TABLE requests ADD ip text;' // update files set style = \'\', description = \'\''
    let sqltext = 'INSERT INTO requests VALUES (?, ?, ?, ?, ?)'
  
       db.run(sqltext, [uuid.v4(), dateToYMDHMS(new Date()), 'sdgfsdfs', req.originalUrl, 'req.body'], (err,rows) => {
  
          if (err) {
              
            res.send( err );
          } else {
              
            res.send( 'ok' );
          }
  
        });
        
     
  })
  
  function dbrun(sqltext, params, callback, callbackerror) {
    
    db.run(sqltext, params, err => {
    
      if (err) {
          
        callbackerror( err );

      } else {
          
        callback()

      }

    });
}

function dball(sqltext, params, callback, callbackerror) {
    
  db.all(sqltext, params, (err, rows) => {
  
    if (err) {
        
      callbackerror( err );

    } else {
        
      callback( rows )

    }

  });
}

app.get('/addrequestsfields', function (req, res) {

  res.send( 'err' )

  dbrun('ALTER TABLE requests ADD ip text;', [], () => {

    dbrun('ALTER TABLE requests ADD song_id text;', [], () => {

      res.send( 'ok' )

    }, err => { res.send( err ) })

  }, err => { res.send( err ) })
    
})
    
    app.get('/requests', function (req, res) {
  
    let sqltext = 'select * from requests order by date desc'
     db.all(sqltext, (err,rows) => {

        if (err) {
            
          res.send( err );
        } else {
            
          res.send( rows );
        }

      });
      
   
})

app.get('/styles', function (req, res) {

    let sqltext = 'select style as name from files group by style order by style'
     db.all(sqltext, (err,rows) => {

        if (err) {
            
          res.send( err );
        } else {
            
          res.send( { rows: rows } );
        }

      });
   
})

  app.get('/file', function (req, res) {
  
    saveRequest(req, () => {
        db.prepare(`SELECT * FROM files where id = ?`)
            .all(req.query.id , (err,rows) => {
  

                let filespath = path.join(__dirname, "files", req.query.id + '.' + rows[0].ext)

                res.setHeader("Content-Type", "application/octet-stream")
                
                return res.download(filespath, encodeURIComponent(rows[0].name + '.' + rows[0].ext))

          }
        )
    }, err => { res.send( err ) } )

        
  })
  
function saveRequest(req, callback, callbackerror) {

  let sqltext = 'INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?, ?)'

  let jb = req.body

  let params = [ 
    
    uuid.v4(), 
    dateToYMDHMS(new Date()), 

    jb && jb.appId ? jb.appId : req.socket.remoteAddress, 
    req.originalUrl, 
    jb ? JSON.stringify(jb) : '',
    req.socket.remoteAddress,
    req.query.id ? req.query.id : ''

  ]

  dbrun( sqltext, params, () => { callback() }, err => { callbackerror( err ) })

}

  app.post('/file', function (req, res) {
  
    saveRequest(req, () => {
    
      res.send( { result: true } )
      
    }, err => { res.send( { result: false, error: err } ) } )
  
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
  