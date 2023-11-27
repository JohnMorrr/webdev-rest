import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8000;

let app = express();
app.use(express.json());

/********************************************************************
 ***   DATABASE FUNCTIONS                                         *** 
 ********************************************************************/
// Open SQLite3 database (in read-write mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Create Promise for SQLite3 database SELECT query 
function dbSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}

// Create Promise for SQLite3 database INSERT or DELETE query
function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

/********************************************************************
 ***   REST REQUEST HANDLERS                                      *** 
 ********************************************************************/
// GET request handler for crime codes
app.get('/codes', (req, res) => {
    let sql = "SELECT code, incident_type AS type FROM Codes ";
    let params = [];
    
    if(req.query.hasOwnProperty("code")){
        let queue = req.query.code.split(",");
        let counter = 0;
        for(let i = 0; i < queue.length; i++){
            if(counter===0){
                sql+= "WHERE code = ? ";
                counter++;
            }else{
                sql+= " OR code = ? ";
                //sql+=  '?';        
            }
            params.push(parseInt(queue[i]));
        }
    };
    sql += " ORDER BY code";
    // console.log(req.query.code);
    // console.log(sql);
    //console.log(params);
    //console.log(req.query); // query object (key-value pairs after the ? in the url)
    dbSelect(sql,params).then((rows)=>{
        res.status(200).type('json').send(rows);
    })
    //res.status(200).type('json').send({}); 
    .catch((error)=>{
        res.status(500).type('txt').send(error);
    });
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    let sql = "SELECT neighborhood_number AS id, neighborhood_name AS name FROM Neighborhoods ";
    let params = [];

    if(req.query.hasOwnProperty("id")){
        let queue = req.query.id.split(",");
        let counter = 0;
        for(let i = 0; i < queue.length; i++){
            if(counter===0){
                sql+= "WHERE id = ? ";
                counter++;
            }else{
                sql+= " OR id = ? ";
                //sql+=  '?';        
            }
            params.push(parseInt(queue[i]));
        }
    };
    
    sql+=" ORDER BY neighborhood_number"
    //console.log(req.query); // query object (key-value pairs after the ? in the url)
    dbSelect(sql,params).then((rows)=>{
        res.status(200).type('json').send(rows);
    })
    //res.status(200).type('json').send({}); 
    .catch((error)=>{
        res.status(500).type('txt').send(error);
    });
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    let sql = "SELECT case_number, date(date_time) AS date, time(date_time) AS time, code, incident, police_grid, neighborhood_number, block FROM Incidents ";
    let params = [];

    if(req.query.hasOwnProperty('start_date')){  // date
        sql+= "WHERE date >= ?";
        params.push(req.query.start_date);
    }else if(req.query.hasOwnProperty('end_date')){
        sql += "WHERE date <= ?";
        params.push(req.query.end_date);
    }

    if(req.query.hasOwnProperty("code")){      // code
        let queue = req.query.id.split(",");
        let counter = 0;
        for(let i = 0; i < queue.length; i++){
            if(counter===0){
                sql+= "WHERE code = ? ";
                counter++;
            }else{
                sql+= " OR code = ? ";
                //sql+=  '?';        
            }
            params.push(parseInt(queue[i]));
        }
    };

    if(req.query.hasOwnProperty('limit')) {     // limit
        let limit = parseInt(req.query.limit);
        if (limit > 0) {
            sql += "WHERE limit = ?";
            params.push(limit);
        } else {
            sql += "WHERE limit = ?";
            params.push(1000);
        }
    }
    
    //console.log(sql);
    //console.log(params);
    sql+=" ORDER BY neighborhood_number"
    //console.log(req.query); // query object (key-value pairs after the ? in the url)
    dbSelect(sql,params).then((rows)=>{
        res.status(200).type('json').send(rows);
    })
    //res.status(200).type('json').send({}); // <-- you will need to change this
    .catch((error)=>{
        res.status(500).type('txt').send(error);
    });
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data

    dbSelect("SELECT COUNT AS count from incidents WHERE case_number = ?", [req.body.case_number]).then((data) => {
        if (data[0].count > 0) {
            throw "Case already exists";
        }

        let sql = 'INSERT INTO incidents (case_number, date_time, code, incident, police_grid, neighborhood_number, block) VALUES (?, ?, ?, ?, ?, ?, ?)';

        let params = [
            req.body.case_number,
            req.body.date_time,
            req.body.code,
            req.body.incident,
            req.body.police_grid,
            req.body.neighborhood_number,
            req.body.block
        ];
        return dbRun(sql, params);
    })
    .then(() => {
        res.status(200).type('txt').send('Added incident');
    })
    .catch((error) => {
        res.status(500).type('txt').send('Error ${error}');
    });
});


// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    console.log(req.body);
    let query = "DELETE FROM incidents WHERE case_number = ?";
    databaseSelect("SELECT COUNT(*) AS count from incidents WHERE case_number = ?", [req.body.case_number])
    .then((data) => {
        if(data[0].count == 0) {
            throw "Case doesn't exist";
        }
        databaseRun(query, [req.body.case_number])
        .then(() => {
            res.status(200).type('txt').send('Success');
        })
    })
    .catch((err) => {
        res.status(500).type('txt').send('Error: Case number does not exist in the database, please select a different case to delete.');
    })
})

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
