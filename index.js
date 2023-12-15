  import express from 'express';
  
  import sqlite3uv from 'sqlite3'
  
  import { v4 } from 'uuid';
  import bodyParser from 'body-parser';
  import cors from 'cors';
  import { join } from 'path';
  
  import path from 'path';
  import { fileURLToPath } from 'url';
  
  const __filename = fileURLToPath(import.meta.url);

  const __dirname = path.dirname(__filename);

  var sqlite3 = sqlite3uv.verbose();

  var db = new sqlite3.Database('player.db');

  import { readdirSync, renameSync } from 'fs';
  
  var app = express();
  
  app.use(cors())
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
  app.use(bodyParser.json({limit: '50mb'}))
  app.use(bodyParser.raw({limit: '50mb'}))

  app.get('/alltables', function (req, res) {
  
    let sqltext = `SELECT name FROM sqlite_master WHERE type='table';`
    db.all(sqltext, [], (err,rows) => { 

      if (err) {
              
        res.send( err );
      } else {
          
        res.send( rows );
      }
    })

  })

  app.get('/tableinfo', function (req, res) {
  
    let sqltext = `PRAGMA table_info("` + req.query.table + `")`
    db.all(sqltext, [], (err,rows) => { 

      if (err) {
              
        res.send( err )

      } else {
          
        res.send( rows )

      }
    })

  })

  function runSql(arSqlTexts, index, callback) {
    
    if (index < arSqlTexts.length) {
      
      db.run(arSqlTexts[index].text, (err,rows) => {

        if (err) {
            
          callback( err );

        } else {
            
          runSql( arSqlTexts, index + 1, callback );
        }

      });

    } else {
      callback()
    }

  }

  app.get('/createupdates', function (req, res) {

    const arSqlTexts = [
      { 
        text: 'CREATE TABLE updates (id TEXT not null, date TEXT not null)', 
      },
      { 
        text: 'INSERT INTO updates VALUES (\'' + v4()  + '\', \'20231214000000\')', 
      },
    ]

    runSql(arSqlTexts, 0, err => {

      if (err) {
        
        res.send( { success: false, error: err } )
        
      } else {
        
        res.send( { success: true } )
      }


    })



  })
  
  app.get('/create', function (req, res) {
  
    const arSqlTexts = [
      { 
        text: 'CREATE TABLE requests (id TEXT not null, date TEXT not null, appid TEXT not null, addr TEXT not null, body TEXT not null, ip TEXT not null, song_id TEXT not null)', 
        executed: '20230201000000' 
      },
      { 
        text: 'CREATE TABLE files (id TEXT not null, name TEXT not null, ext TEXT not null, description TEXT not null, style TEXT not null)', 
        executed: '20230201000000' 
      },
      { 
        text: 'CREATE TABLE favorites (id TEXT not null, appid TEXT not null, file_id TEXT not null)', 
        executed: '20230201000000' 
      },
      { 
        text: 'CREATE TABLE users (id TEXT not null, name TEXT not null, password TEXT not null)', 
        executed: '20231201000000' 
      },
      { 
        text: 'CREATE TABLE history (id TEXT not null, date TEXT not null, appid TEXT not null, user_id TEXT not null, file_id TEXT not null)', 
        executed: '20231212000000' 
      },
      { 
        text: 'ALTER TABLE favorites ADD user_id text', 
        executed: '20231212000000' 
      },
    ]

    db.all('SELECT MAX(date) as max_date FROM updates ', [] , (err,rows) => { 
      
      const arSqlTextsFiltered = arSqlTexts.filter(s => s.executed > rows[0].max_date)

      runSql(arSqlTextsFiltered, 0, err => {

        if (err) {
          
          res.send( { success: false, error: err } )
          
        } else {
          
          db.run('INSERT INTO updates VALUES (\'' + v4()  + '\', \'' + dateToYMDHMS(new Date()) + '\')', (err, rows) => {

            if (err) {
              
              res.send( { success: false, error: err } )
              
            } else {
              
              res.send( { success: true } )
            }
      
          })
        }

      })

    });




/*     requests = [
      {"cid":0,"name":"id","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":1,"name":"date","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":2,"name":"appid","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":3,"name":"addr","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":4,"name":"body","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":5,"name":"ip","type":"TEXT","notnull":0,"dflt_value":null,"pk":0},
      {"cid":6,"name":"song_id","type":"TEXT","notnull":0,"dflt_value":null,"pk":0}
    ]
 */


/*     files = [
      {"cid":0,"name":"id","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":1,"name":"name","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":2,"name":"ext","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":3,"name":"description","type":"TEXT","notnull":0,"dflt_value":null,"pk":0},
      {"cid":4,"name":"style","type":"TEXT","notnull":0,"dflt_value":null,"pk":0}
    ]
 */

/*     favorites = [
      {"cid":0,"name":"id","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":1,"name":"appid","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":2,"name":"file_id","type":"TEXT","notnull":1,"dflt_value":null,"pk":0}
    ]
 */

/*     users = [
      {"cid":0,"name":"id","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":1,"name":"name","type":"TEXT","notnull":1,"dflt_value":null,"pk":0},
      {"cid":2,"name":"password","type":"TEXT","notnull":1,"dflt_value":null,"pk":0}
    ]
 */

/*     db.run(sqltext, (err,rows) => {

        if (err) {
            
          res.send( err );
        } else {
            
          res.send( rows );
        }

      });
  
 */  

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
  
app.get('/shtrihcodes', function (req, res) {

  res.send( { result: true, rows: [

    { shtrihcode: '5000394116085', ref1: 'prn?id=045cea1e-db39-4fc7-bb88-b732a8a800fc', ref2: 'prn?id=04689f5b-634c-4b6a-84fe-2d14d7ebc81a' },
    { shtrihcode: '5000394116044', ref1: 'prn/fnmdnblgyjfgds.pdf', ref2: 'prn/dhfkjllhdg.pdf' }

    ] } )

})

app.get('/prn', function (req, res) {

  let filespath = join(__dirname, "prns", req.query.id + '.pdf')

  res.setHeader("Content-Type", "application/octet-stream")

  return res.download(filespath, encodeURIComponent(req.query.id + '.pdf'))

})

app.post('/files', function (req, res) {

  saveRequest(req, () => {
    
    let jb = req.body

    let appId = jb && jb.appId ? jb.appId : ''

    let newOnly = jb && jb.newOnly ? jb.newOnly : false

    let favorites = jb && jb.favorites ? jb.favorites : false

    let limit = jb && jb.limit ? jb.limit : 100
    let random = jb && jb.random ? jb.random : false

    let arWhere = jb && jb.where ? JSON.parse(jb.where) : []

    if (favorites) {

      arWhere.push(' ifnull(favorites.id, 0) != 0 ')
      
    }

    let arOrder = jb && jb.order ? JSON.parse(jb.order) : []

    let strWhere = arWhere.length > 0 ? 'where ' + arWhere.join( ' and ' ) : ''
    let strOrder = arOrder.length > 0 ? 'order by ' + arOrder.join( ' , ' ) : ''

    let strNewOnly = newOnly ? 'left join requests on files.id = requests.song_id and requests.appid = \'' + appId + '\'' : ''

    let sqltext = 'SELECT files.*, ifnull(favorites.id, 0) as favorite '
      + ' FROM files left join favorites on favorites.file_id = files.id and favorites.appid = \'' + appId + '\' ' 
      + strNewOnly + ' ' + strWhere + ' ' + strOrder + ' limit ' + limit

    let params = jb && jb.params ? jb.params : []

    

    dball(sqltext, params, rows => { 
      
      res.send( { result: true, rows: random ? shuffle(rows) : rows } ) 

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
  
  let filespath = join(curPath, curCat)

  const dirEntries = readdirSync(filespath, {withFileTypes: true})

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

              let curId = v4()

              db.prepare("INSERT INTO files VALUES (?, ?, ?, ?, ?)")
                .run(curId, curFile.name, curFile.ext, curFile.style, '', (err,rows) =>{
          
                  if (err) {
                    
                    callbackerror( err )
                    
                  } else {

                    renameSync(join(curFile.path, curFile.name + '.' + curFile.ext), join(__dirname, "files", curId + '.' + curFile.ext));

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
  
       db.run(sqltext, [v4(), dateToYMDHMS(new Date()), 'sdgfsdfs', req.originalUrl, 'req.body'], (err,rows) => {
  
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

  let sqltext = 'select * from requests order by date desc limit 100'
    db.all(sqltext, (err,rows) => {

      if (err) {
          
        res.send( err );
      } else {
          
        res.send( rows );
      }

    });
    
  
})

app.get('/users', function (req, res) {

  const jr = req.query

  saveRequest(req, () => {

    if (!jr.name) {
      
      res.send( { rows: [], message: 'name must be specified' } )

    } else if (!jr.password) {
      
      let sqltext = 'select id, name from users where name = ?'
      dball(sqltext, [jr.name.toLowerCase()], rows => { res.send( { rows: rows } ) }, err => { res.send( { rows: [], error: err } ) })
  
    } else {
        
      let sqltext = 'select * from users where name = ? and password = ?'
      dball(sqltext, [jr.name.toLowerCase(), jr.password], rows => { res.send( { rows: rows } ) }, err => { res.send( { rows: [], error: err } ) })
    }

  })  
})

app.get('/adduser', function (req, res) {

  saveRequest(req, () => {

    const jb = req.query

    const params = [

      v4(),
      jb.name.toLowerCase(),
      jb.password

    ]



    dbrun('INSERT INTO users VALUES (?, ?, ?)', params, () => { res.send( { result: true } ) }, 
      
    err => { res.send( { result: false, error: err } ) } )
  })

})

app.get('/favorites', function (req, res) {

  const userId = req.query.userid

  let sqltext = 'select favorites.id, favorites.file_id, files.name, files.ext, files.style, files.description '
    + ' from favorites left join files on favorites.file_id = files.id where' + (userId ? ' favorites.user_id = ?' : ' favorites.appid = ?')
  dball(sqltext, [userId ? userId : req.query.appid], rows => { res.send( { rows: rows } ) }, err => { res.send( err ) })
  
})

app.post('/favorites', function (req, res) {

  let jb = req.body
  
  saveRequest(req, () => {

    if (jb.mode == 'add') {
      
      let params = [

        v4(),
        jb.appId,
        jb.file_id,
        jb.userId || ''

      ]

      dbrun('INSERT INTO favorites VALUES (?, ?, ?, ?)', params, () => { res.send( { result: true } ) }, 
      
        err => { res.send( { result: false, error: err } ) } )

    } else {
      
      const userId = jb.userid

      let params = [

        userId ? userId : jb.appId,
        jb.file_id

      ]

      dbrun("DELETE FROM favorites where " + (userId ? 'user_id' : 'appid') + " = ? and file_id = ?", params, () => { res.send( { result: true } ) }, 
      
        err => { res.send( { result: false, error: err } ) } )

    }

  }, err => { res.send( { result: false, error: err } ) } )



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
  
              const params = [
                v4(),
                dateToYMDHMS(new Date()),
                req.query.appid,
                req.query.userid || '',
                req.query.id
              ]

              dbrun('INSERT INTO history VALUES (?, ?, ?, ?, ?)', params, () => { 

                let filespath = join(__dirname, "files", req.query.id + '.' + rows[0].ext)

                res.setHeader("Content-Type", "application/octet-stream")
                
                return res.download(filespath, encodeURIComponent(rows[0].name + '.' + rows[0].ext))

              }, 
      
              err => { res.send( { result: false, error: err } ) } )
      
      

          }
        )
    }, err => { res.send( err ) } )

        
  })
  
function saveRequest(req, callback, callbackerror) {

  let sqltext = 'INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?, ?)'

  let jb = req.body

  let params = [ 
    
    v4(), 
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
  
      stmt.run( v4(), name, ext , (err,rows) =>{
  
          res.send(true);
      });
  
      stmt.finalize();
  
  });
  
  app.listen( 3001, function () {
      console.log('Player server ready');
  });
  