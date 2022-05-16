require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParse = require("body-parser");
const mongoose = require("mongoose");
const dns = require('dns');
const urlModule = require('url');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// use bodyParser middleware
app.use("/api/shorturl",bodyParse.urlencoded({extended: false}));

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const urlSchema = new mongoose.Schema({
  original: {type: String, required: true},
  shorturl: Number,
});

const URL = mongoose.model("URL", urlSchema);

// fetch from database or insert
app.post("/api/shorturl", function(req, res) {
  let userUrl = req.body.url;
  let nextNum;
  let urlObject;
  try {
    urlObject = new urlModule.URL(userUrl);
    dns.lookup(urlObject.hostname, function (err, addresses, family) {
      if (addresses === undefined) res.json({ error: 'invalid url' });
      else {
        URL.findOne({}).sort({shorturl: -1}).exec(function(err, doc){
          if (err) console.error(err);
          nextNum = doc.shorturl;
          URL.findOneAndUpdate({original: userUrl}, 
                           { $setOnInsert: { shorturl: nextNum + 1 } },
                           { upsert: true, new: true })
            .exec(function(err, doc){
              if (err) console.error(err);
              res.json({original_url: doc.original, short_url: doc.shorturl});
            })
        });
      }
    });
    
  } catch {
    res.json({ error: 'invalid url' });
  }
});

app.get("/api/shorturl/:number?", function(req, res){
  let shortUrl = req.params.number;
  URL.findOne({shorturl: shortUrl}).exec(function(err, doc){
    if (err) console.error(err);
    if (doc === null) {
      res.json({"error":"No short URL found for the given input"});
    } else {
      res.redirect(doc.original);
    }
  })
})
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
