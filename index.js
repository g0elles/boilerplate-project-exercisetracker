const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);
const Schema = mongoose.Schema;
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

// Mongo Schema Section

const UserSchema = new Schema({
  username: String
}, {
  versionKey: false // You should be aware of the outcome after set to false
});

const ExcerciseSchema = new Schema({
  username: String,
  description: String,
  duration: Number,
  date: String,
  _id: String
}, {
  versionKey: false // You should be aware of the outcome after set to false
});

const logSchema = new Schema({
  username: String,
  count: Number,
  _id: String,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
}, {
  versionKey: false // You should be aware of the outcome after set to false
});

// Model Building
const Users = mongoose.model("Users", UserSchema);
const Excercises = mongoose.model("Excercises", ExcerciseSchema);
const Logs = mongoose.model("Logs", logSchema);



app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post("/api/users", async (req, res, next) => {
  const username = req.body.username;
  let userExist = await Users.findOne({
    username: username
  });

  if (userExist) {
    res.json({
      username: userExist.username,
      _id: userExist._id
    });
  } else {
    let newUser = new Users({
      username: username
    });
    await newUser.save();
    let log = new Logs({
      username: newUser.username,
      count: 1,
      _id: newUser._id,
      log: []
    });
    log.save();
    res.json({
      username: newUser.username,
      _id: newUser._id
    });
  }
  next();
});

app.get("/api/users", (req, res, next) => {
  Users.find({}).then((users) => {
    res.send(users);
    next();
  });
});

app.post("/api/users/:_id/exercises", async (req, res, next) => {
  const Excercise = {
    username: "",
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date ? new Date(req.body.date.replace(/-/g, '\/')).toDateString() : new Date().toDateString(),
    _id: req.params._id
  };

  let exist = await Users.findById({
    _id: Excercise._id
  });
  if (exist) {
    Excercise.username = exist.username;
    let response;

    let CurrentExcercise = await Excercises.findByIdAndUpdate({
      _id: Excercise._id
    }, {
      description: Excercise.description,
      duration: Excercise.duration,
      date: Excercise.date
    });
    if (CurrentExcercise) {
      response = CurrentExcercise;
    } else {
      let newExcercise = new Excercises({
        username: Excercise.username,
        description: Excercise.description,
        duration: Excercise.duration,
        date: Excercise.date,
        _id: Excercise._id
      });
      newExcercise.save();
      response = newExcercise;
    }

    await Logs.findOne({
      _id: Excercise._id
    }, (err, logFound) => {
      if (err) console.log(err);
      logFound.log.push(Excercise);
      logFound.count = logFound.log.length;
      logFound.save();
    }).clone();
    res.send(Excercise);
    next();
  }
});

app.get("/api/users/:_id/logs", async (req, res, next) => {
  let userId = req.params._id;
  let [from, to, limit] = [req.query.from, req.query.to, req.query.limit];

  await Logs.findById({
    _id: userId
  }, (err, data) => {
    let result = data;

    if (from && to) {
      let fromDate = new Date(from);
      let toDate = new Date(to);
      result._doc.log = result._doc.log.filter(x => isBetweenDates(new Date(x.date), fromDate, toDate));
    }

    if (limit) {
      let limiter = limit != undefined ? parseInt(limit) : 0;
      result._doc.log = result._doc.log.slice(0, limiter > 0 ? limiter : result.log.length);
    }

    res.send(result);
    next();
  }).clone();
});




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

function isBetweenDates(date, from, to) {
  return (from < date) && (date < to);
}