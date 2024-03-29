  import express from 'express';
  
  import sqlite3uv from 'sqlite3'
  
  import { v4 } from 'uuid';
  import bodyParser from 'body-parser';
  import cors from 'cors';
  import { join } from 'path';
  
  import path from 'path';
  import { fileURLToPath } from 'url';

  import fs from 'fs';
  
  const __filename = fileURLToPath(import.meta.url);

  const __dirname = path.dirname(__filename);

  var sqlite3 = sqlite3uv.verbose();

  var db = new sqlite3.Database('player.db');

  import { readdirSync, renameSync, existsSync, mkdir, mkdirSync } from 'fs';
  
  const filesPath = join(__dirname, "files")

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

  app.get('/tablerecords', function (req, res) {
  
    const tableName = req.query.table
    const limit = req.query.limit || 100
    const offset = req.query.offset || 0

    if (tableName) {
      
        db.all('SELECT * FROM ' + tableName + ' limit ' + limit + ' offset ' + offset, [] , (err,rows) => { 
        
          if (err) {
            
            res.send( { success: false, error: err } )

          } else {
            
            res.send( { success: true, rows: rows } )
          }
  
        
        });
  
    } else {

      res.send( { success: false, message: 'table required' } )

    }

  });
  
  function modifyRecords(tableName, records, index, callback) {
    
    if (index < records.length) {
      
      const record = records[index]

      const sqlTextSearch = 'SELECT id from ' + tableName + ' where id = ?'
      const paramsSearch = [record.id]

      db.all(sqlTextSearch, paramsSearch , (err,rows) => { 
      
        if (err) {
            
          callback( err )

        } else {
          
          if (rows.length) {

            // update
            
            modifyRecords(tableName, records, index + 1, callback)

          } else {
            
            // insert

            const symbQ = []
            const paramsInsert = []
            for (var key in record) {
             
              paramsInsert.push(record[key])

              symbQ.push('?')

            }

            const sqlTextInsert = 'INSERT INTO ' + tableName + ' VALUES (' + symbQ.join(',') + ')'

            db.run(sqlTextInsert, paramsInsert, err => {

              if (err) {
                
                callback(err)

              } else {
                
                modifyRecords(tableName, records, index + 1, callback)

              }

            })

          }

        }

    
      });

/*       
      const sqlTextUpdate = 'UPDATE ' + tableName + ' SET @@expr@@ where id = ?'

 */


    } else {
      
      callback()

    }

  }

  app.post('/tablerecords', function (req, res) {
  
    const tableName = req.query.table
    const records = req.body.records

    if (!tableName) {
      
      res.send( { success: false, message: 'table required' } )

    } 
    else if (!records || !records.length) {
      
      res.send( { success: false, message: 'records required' } )

    } 
    else {

      modifyRecords(tableName, records, 0, err => {

          if (err) {
            
            res.send( { success: false, error: err } )

          } else {
            
            res.send( { success: true } )
          }
  
      })

    } 


  });

  function setObjects(params, index, callback) {
    
    if (index < params.objects.length) {
      
      const object = params.objects[index]

      if (object.Тип == 'Справочник') {

        if (object.Вид == 'Стили') {

          const tableName = 'styles'
          const records = [
            { id: object.Ссылка, name: object.Наименование, comment: object.Реквизиты.Комментарий }
          ]
          
          modifyRecords(tableName, records, 0, err => {

            if (err) {

              callback(err)
              
            } else {
              
              setObjects(params, index + 1, callback)

            }

          })

        } else {
          
          setObjects(params, index + 1, callback)

        }
        
      } else {
        
        setObjects(params, index + 1, callback)

      }

    } else {
      
      callback()

    }
    

  }

  function executeRequests(requests, index, callback) {
   
    if (index < requests.length) {
      
      const request = requests[index]

      if (request.request == 'setObjects') {
        
        setObjects(request.parameters, 0, err => {

          if (err) {

            callback(err)

          } else {

            executeRequests(requests, index + 1, callback)

          }
            
        })

      } else {
        
        executeRequests(requests, index + 1, callback)

      }

    } else {
      
      callback()

    }
    
  }

  app.post('/objects', function (req, res) {
  
    const arBody = req.body

    executeRequests(arBody, 0, err => {

        if (err) {
          
          res.send( { success: false, error: err } )

        } else {
          
          res.send( { success: true } )
        }

    })

     


  });

  


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
  
  function createUpdatesTable(callback) {

    let sqltext = `SELECT name FROM sqlite_master WHERE type='table' and name='updates';`
    db.all(sqltext, [], (err,rows) => { 

      if (err) {
              
        callback( err );
      } else {
        
        if (rows.length) {
          
          callback( );
        } else {

          const arSqlTexts = [
            { 
              text: 'CREATE TABLE updates (id TEXT not null, date TEXT not null)', 
            },
            { 
              text: 'INSERT INTO updates VALUES (\'' + v4()  + '\', \'20230101000000\')', 
            },
          ]

          runSql(arSqlTexts, 0, err => {

            if (err) {
              
              callback( err );
              
            } else {
              
              

              callback(  );
            }


          })
          
          
        }

      }
    })

    
  }

function updatetables(callback) {

  createUpdatesTable(err => {

    if (err) {

      callback( err )

    } else {

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
        {
          text: 'CREATE TABLE authors (id TEXT not null, name TEXT not null)',
          executed: '20231217000000'
        },
        {
          text: 'CREATE TABLE albums (id TEXT not null, name TEXT not null, author_id TEXT not null)',
          executed: '20231217000000'
        },
        {
          text: 'CREATE TABLE album_songs (id TEXT not null, album_id TEXT not null, song_id TEXT not null)',
          executed: '20231217000000'
        },
        {
          text: 'CREATE TABLE styles (id TEXT not null, name TEXT not null, comment TEXT not null)',
          executed: '20231217181200'
        },
        {
          text: 'CREATE TABLE song_styles (id TEXT not null, song_id TEXT not null, style_id TEXT not null, importance INT not null)',
          executed: '20231217181200'
        },
      ]

      db.all('SELECT MAX(date) as max_date FROM updates ', [], (err, rows) => {

        const arSqlTextsFiltered = arSqlTexts.filter(s => s.executed > rows[0].max_date)

        runSql(arSqlTextsFiltered, 0, err => {

          if (err) {

            callback( err )

          } else {

            db.run('INSERT INTO updates VALUES (\'' + v4() + '\', \'' + dateToYMDHMS(new Date()) + '\')', (err, rows) => {

              callback( err )

            })
          }

        })

      })
    }

  })
}

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

function sendRowsOrErr(res, err, rows) {

  if (err) {

    res.send( { success: false, message: err, err: err } )

  } else {

    res.send( { success: true, rows: rows } )

  }

}

app.get('/', function (req, res) {

  sendRowsOrErr(res, null, [])

});

app.get('/shtrihcodes', function (req, res) {

  res.send({
    result: true, rows: [

      { shtrihcode: '5000394116085', ref1: 'prn?id=045cea1e-db39-4fc7-bb88-b732a8a800fc', ref2: 'prn?id=04689f5b-634c-4b6a-84fe-2d14d7ebc81a' },
      { shtrihcode: '5000394116044', ref1: 'prn/fnmdnblgyjfgds.pdf', ref2: 'prn/dhfkjllhdg.pdf' }

    ]
  })

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
    let userId = jb && jb.userId ? jb.userId : ''

    let newOnly = jb && jb.newOnly ? jb.newOnly : false

    let favorites = jb && jb.favorites ? jb.favorites : false

    let limit = jb && jb.limit ? jb.limit : 100
    let random = jb && jb.random ? jb.random : false

    let arWhere = jb && jb.where ? JSON.parse(jb.where) : []

    if (favorites) {

      arWhere.push(' ifnull(favorites.file_id, 0) != 0 ')
      
    }

    if (newOnly) {

      arWhere.push(' history.file_id is null ')
      
    }

    let arOrder = jb && jb.order ? JSON.parse(jb.order) : []

    let strWhere = arWhere.length > 0 ? 'where ' + arWhere.join( ' and ' ) : ''
    let strOrder = arOrder.length > 0 ? 'order by ' + arOrder.join( ' , ' ) : ''

    let strNewOnly = 'left join (select file_id from history where '  
      + (userId ? 'history.user_id = \'' + userId + '\'' : 'history.appId = \'' + appId + '\'' )
    + ' group by file_id ) as history on files.id = history.file_id ' 

    let sqltext = 'SELECT files.*, ifnull(favorites.file_id, 0) as favorite, case when history.file_id is null then 1 else 0 end as new '
      + ' FROM files left join (select file_id, appid from favorites group by file_id, appid) as favorites on favorites.file_id = files.id and favorites.appid = \'' + appId + '\' ' 
      + strNewOnly + ' ' + strWhere + ' ' + strOrder + ' limit ' + limit

    let params = jb && jb.params ? jb.params : []

    

    dball(sqltext, params, rows => { 
      
      res.send( { result: true, rows: random ? shuffle(rows) : rows } ) 

    }, err => { res.send( { result: false, error: err } ) } )

  }, err => { res.send( { result: false, error: err } ) } )

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




app.get('/addfiles', function (req, res) {
  
  

     let filespath = path.join(__dirname, "files")
  
    let mFiles = []
  
    readCatalog(mFiles, filespath, '')
  
    addFileToBase(mFiles, 0, () => { res.send( mFiles ) }, err => { res.send( err ) })
    
})

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
  
app.get('/test', function (req, res) {
  
  res.send( { success: true } )
  
    
/*     //let sqltext = 'ALTER TABLE requests ADD ip text;' // update files set style = \'\', description = \'\''
    let sqltext = 'INSERT INTO requests VALUES (?, ?, ?, ?, ?)'
  
       db.run(sqltext, [v4(), dateToYMDHMS(new Date()), 'sdgfsdfs', req.originalUrl, 'req.body'], (err,rows) => {
  
          if (err) {
              
            res.send( err );
          } else {
              
            res.send( 'ok' );
          }
  
        });
 */        
     
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

app.get('/history', function (req, res) {

  const userId = req.query.userid

  let sqltext = 'select history.id, history.date, history.file_id, files.name, files.ext, files.style, files.description '
    + ' from history left join files on history.file_id = files.id where' + (userId ? ' history.user_id = ?' : ' history.appid = ?')
    + ' order by date desc limit 100'

  db.all(sqltext, [userId ? userId : req.query.appid], (err, rows) => {

    if (err) {
        
      res.send( { error: err } );

    } else {
        
      res.send( { rows } );
    }

  })
    
  
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

    const userId = v4()

    const params = [

      userId,
      jb.name.toLowerCase(),
      jb.password

    ]



    dbrun('INSERT INTO users VALUES (?, ?, ?)', params, () => { res.send( { result: true, id: userId } ) }, 
      
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

function insertHistory(params, callback) {

  const sqlParams = [
    v4(),
    dateToYMDHMS(new Date()),
    params.appid || '',
    params.userid || '',
    params.id
  ]

  const sqltext = 'INSERT INTO history VALUES (?, ?, ?, ?, ?)'
  db.run(sqltext, sqlParams, err => {

    callback(err)

  })


  
}

  app.get('/file', function (req, res) {
  
    saveRequest(req, () => {
        db.prepare(`SELECT * FROM files where id = ?`)
            .all(req.query.id , (err,rows) => {
  
              if (err) {
                res.send( { result: false, error: err } )
              } else {
                
                let filespath = join(__dirname, "files", req.query.id + '.' + rows[0].ext)

                res.setHeader("Content-Type", "application/octet-stream")
                
                return res.download(filespath, encodeURIComponent(rows[0].name + '.' + rows[0].ext))

              }

         })
    })
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
    
      insertHistory(req.query, err => {

        if (err) {
          
          res.send( { result: false, error: err } )

        } else {
          
          res.send( { result: true } )
        }



      })

      
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
  
function writeToFile(fileExist, id, ext, reqbody, callback) {

  const fullName = path.join(filesPath, id + '.' + ext)

  if (fileExist) {

    fs.appendFile(fullName, reqbody, function (err, data) {

      callback(err)

    })

  } else {

    fs.writeFile(fullName, reqbody, function (err, data) {

        callback(err)

    })
  }
}

app.get('/upload', cors(), (req, res) => {

  const fileNameSplitted = req.query.filename.split('.')

  res.send( { ext: fileNameSplitted[fileNameSplitted.length - 1] } )

})

function sendErr(res, error, callback) {

  if (error) {

    res.send( { result: false, error } )
    
  } else {
    
    if (callback) {
      
      callback()
    }

  }
  
}

app.post('/upload', cors(), (req, res) => {

  var id = v4()
  var filename = ''
  var description = ''
  var style = ''
  var size = ''
  req.rawHeaders.forEach((element, index, array) => {
    if (element === 'id')
      id = array[index + 1]

    if (element === 'filename')
      filename = decodeURIComponent(array[index + 1])

    if (element === 'description')
      description = decodeURIComponent(array[index + 1])

    if (element === 'style')
      style = decodeURIComponent(array[index + 1])

    if (element === 'size')
      size = Number(array[index + 1])

  })

  const fileNameSplitted = filename.split('.')

  const ext = fileNameSplitted.length == 1 ? '' : fileNameSplitted[fileNameSplitted.length - 1] 

  let name = filename
  if (fileNameSplitted.length > 1) {
  
    fileNameSplitted.splice(-1, 1)

    name = fileNameSplitted.join('.')
    
  }

  db.prepare(`SELECT * FROM files where id = ?`)
    .all(id, (err, rows) => {

      sendErr(res, err, () => {

        const fileExist = rows.length > 0

        writeToFile(fileExist, id, ext, req.body, err => {

          sendErr(res, err, () => {

            if (!fileExist) {
              
              const sqlText = 'INSERT INTO files VALUES (?, ?, ?, ?, ?)'
              db.run(sqlText, [ id, name, ext, description, style ], err => {

                sendRowsOrErr( res, err, [ { id, name, ext, description, style } ] )

              })

            }


          })

        })

      })

    })



/*     var pPool = null

    var file_exist = false

    sql.connect(config).then(pool => {

        pPool = pool

        return pool.request()
            .input('id', id)
            .query('select * from files where id = @id')

    }).then(result => {

        file_exist = result.recordset.length > 0

        writeToFile(file_exist, id, req, () => {

            if(file_exist) {

                pPool.request()
                    .input('id', id)
                    .input('size', result.recordset[0].size + size)
                    .query('update files set size = @size where id = @id')
                    .then(result => {
                        
                        res.json({ 'success': true, 'message': '' })
                    })
                    .catch(err => {

                        res.json({ 'success': false, 'message': err.message })
                
                    })

            } else {

                let words = filename.split('.')
                let ext = words[words.length - 1]

                words.splice(words.length - 1, 1)

                filename = words.join('.')

                pPool.request()
                    .input('name', sql.Char, user)
                    .query('select * from users where name = @name or id = @name')
                    .then(result => {

                        var user_id = result.recordset[0].id

                        pPool.request()
                            .input('id', sql.Char, id)
                            .input('name', sql.Char, decodeURIComponent(filename))
                            .input('ext', sql.Char, ext)
                            .input('comment', sql.Char, '')
                            .input('size', sql.Int, size)
                            .input('created', sql.Char, datestr.dateToStr(new Date()))
                            .input('is_deleted', sql.Bit, 0)
                            .input('is_folder', sql.Bit, 0)
                            .input('parent_id', sql.Char, uuidNil)
                            .input('user_id', sql.Char, user_id)
                            .input('hash', sql.Char, '')
                            .query('insert into files (id, name, ext, comment, size, created, is_deleted, is_folder, parent_id, user_id, hash) '
                                + 'values (@id, @name, @ext, @comment, @size, @created, @is_deleted, @is_folder, @parent_id, @user_id, @hash) ')
                            .then(result => {

                                if(owner_id){

                                    if(owner_name === 'file_versions'){

                                        pPool.request()
                                            .input('file_id', sql.Char, owner_id)
                                            .query('select top 1 * from file_versions where file_id = @file_id order by number desc')
                                            .then(result => {

                                                var lastNumber = 0
                                                if(result.recordset.length > 0){
                                                
                                                    lastNumber = result.recordset[0].number
                                                    
                                                }


                                                pPool.request()
                                                    .input('id', sql.Char, id)
                                                    .input('file_id', sql.Char, owner_id)
                                                    .input('number', sql.SmallInt, lastNumber + 1)
                                                    .input('comment', sql.Char, '')
                                                    .input('created', sql.Char, datestr.dateToStr(new Date()))
                                                    .input('is_deleted', sql.Bit, 0)
                                                    .input('user_id', sql.Char, user_id)
                                                    .query('insert into file_versions (id, file_id, number, comment, created, is_deleted, user_id) '
                                                        + 'values (@id, @file_id, @number, @comment, @created, @is_deleted, @user_id) ')
                                                    .then(result => {
        
                                                        res.json({ 'success': true, 'message': ''})
                                                        
                                                    })
                                                    .catch(err => {
        
                                                        res.json({ 'success': false, 'message': err.message })
        
                                                    })
                                                
                                            })
                                            .catch(err => {

                                                res.json({ 'success': false, 'message': err.message })

                                            })

                                    } else {

                                        pPool.request()
                                            .input('id', sql.Char, uuidv4())
                                            .input('file_id', sql.Char, id)
                                            .input('owner_name', sql.Char, decodeURIComponent(owner_name))
                                            .input('owner_id', sql.Char, owner_id)
                                            .input('comment', sql.Char, '')
                                            .input('created', sql.Char, datestr.dateToStr(new Date()))
                                            .input('is_deleted', sql.Bit, 0)
                                            .input('user_id', sql.Char, user_id)
                                            .query('insert into file_owners (id, file_id, owner_name, owner_id, comment, created, is_deleted, user_id) '
                                                + 'values (@id, @file_id, @owner_name, @owner_id, @comment, @created, @is_deleted, @user_id) ')
                                            .then(result => {

                                                res.json({ 'success': true, 'message': ''})
                                                
                                            })
                                            .catch(err => {

                                                res.json({ 'success': false, 'message': err.message })

                                            })
                                            
                                    }

                                } else {

                                    res.json({ 'success': true, 'message': ''})

                                }

                            }).catch(err => {

                                res.json({ 'success': false, 'message': err.message })

                            })

                    }).catch(err => {

                        res.json({ 'success': false, 'message': err.message })

                    })

            }

        }, (err) => {
            
            res.json({ 'success': false, 'message': err.message })

        })

    })
 */
})




if (!existsSync(filesPath)) {
  mkdirSync(filesPath)

  console.log('Files created');

}

updatetables(err => {

  console.log('Tables updated');

  app.listen(3001, function () {

    console.log('Player server ready');



  });

})

