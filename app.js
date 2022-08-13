//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
const uri = process.env.MONGODB_URI;

// console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

// app.use(passport.initialize());
// app.use(passport.session());

mongoose.connect("mongodb+srv://admin:nUR7W3CttHeQjJzD@cluster0.edolsg4.mongodb.net/?retryWrites=true&w=majority");



const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  socialMediaId: String,
  provider: String,
  secret: String //could hash maybe
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());


passport.serializeUser(function(user, done) {
done(null, user.id);
});

passport.deserializeUser(function(id, done) {
User.findById(id, function(err, user) {
done(err, user);
});
});


// // Configure Passport authenticated session persistence.
// passport.serializeUser(function(user, cb) {
//     cb(null, user);
// });
// passport.deserializeUser(function(obj, cb) {
//    cb(null, obj);
// });
// //


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ socialMediaId: profile.id, provider: profile.provider }, function (err, user) {
      return cb(err, user);
    });
  }
));


passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
    // enableProof: true
    // profileFields: ['id', 'displayName', 'email']
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ socialMediaId: profile.id, provider: profile.provider }, function (err, user) {
      return cb(err, user);
    });
  }
));

// console.log(profile);
// User.findById(profile.id, function(err, matchFound) {
//   if (!err) {
//     if(matchFound) {
//       console.log("Match Found");
//     } else {
//       user = new User {
//
//       }
//     }
//
//   } else {
//     console.log(err);
//   }
//
// })
//
      // if (user) {
      //   done(null, user); //If User already exists login as stated on line 10 return User
      // } else { //else create a new User
      //   user = new User({
      //     facebook_id: profile.id, //pass in the id and displayName params from Facebook
      //     name: profile.displayName
      //   });
      //   user.save(function(err) { //Save User if there are no errors else redirect to login route
      //    if(err) {
      //      console.log(err);  // handle errors!
      //    } else {
      //      console.log("saving user ...");
      //      done(null, user);
      //    }
      //  });
    // User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });
//   }
// });
// }
// ));


// passport.use(
//     new FacebookStrategy(
//       {
//         clientID: process.env.CLIENT_ID_FB,
//         clientSecret: process.env.CLIENT_SECRET_FB,
//         callbackURL: "http://localhost:3000/auth/facebook/secrets",
//       },
//       async function (accessToken, refreshToken, profile, cb) {
//         const [user, status] = await User.findOrCreate({
//           where: {
//             social_user_id: profile.id,
//             name: profile.displayName,
//             registration_type: "facebook",
//           },
//         });
//         cb(null, user);
//       }
//     )
//   );

app.use(passport.initialize());
app.use(passport.session());


app.get("/", function(req, res){

  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));

  app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

  app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ["public_profile"] }));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res) {
User.find({"secret": {$ne:null}}, function(err, foundUsers){
  if (err) {
    console.log(err);
  } else {
    if(foundUsers) {
      res.render("secrets", {usersWithSecret: foundUsers});
    }
  }
});
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
  res.render("submit");
  } else {
  res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
const submittedSecret = req.body.secret;
console.log(req.user.id);
User.findById(req.user.id, function(err, foundUser) {
  if(err) {
    console.log(err);
  } else {
  if(foundUser) {
    foundUser.secret = submittedSecret;
    foundUser.save(function(){
      res.redirect("/secrets");
    });
  }
  }
});




});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res) {

  User.register({username: req.body.username}, req.body.password, function(err, user) {
  if (err) {
  console.log(err);
  res.redirect("/register");
  } else {
  passport.authenticate("local")(req, res, function(){
  res.redirect("/secrets");
  });
  }
  });
  });


app.post("/login", function(req, res){

  const user = new User({
  username: req.body.username,
  password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
  });

});

app.listen(3000, function(){
  console.log("Server started on port 3000.");
});


//LOGIN
// const username = req.body.username;
// const password = req.body.password;
//
//
// User.findOne({email: username}, function(err, foundUser){
//   if(err){
//     console.log(err);
//   } else {
//     if (foundUser) {
//       bcrypt.compare(password, foundUser.password, function(err, result) {
//         if (result === true) {
//           res.render("secrets");
//         }
//       });
//     }
//   }
//
// });
//END LOGIN

//REGISTER
// bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//   const newUser = new User ({
//     email: req.body.username,
//     password: hash
//   });
//
//   newUser.save(function(err){
//     if(err){
//       console.log(err);
//     } else {
//       res.render("secrets");
//     }
//   });
// });

//END REGISTER
