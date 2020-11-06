const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const https = require("https");

const app = express();

app.use(express.static("public"));
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use(bodyParser.urlencoded({extended:true}));

app.set('view engine', 'ejs');

app.use(session({
    secret: "Whatever guys!!!",
    resave: false,
    saveUninitialized: true,
    cookie: {}
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/cryptoUsersDB", {useUnifiedTopology:true, useNewUrlParser:true});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    favs: [String]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var currencyDetails = [];

https.get("https://api.coincap.io/v2/assets", (apiResponse) => {
    let data = '';

    apiResponse.on('data', (chunk) => {
      data += chunk;
    });
  
    apiResponse.on('end', () => {
        var w = JSON.parse(data)["data"];
        for(var i=0; i< w.length; i++){
            var currencyObject = {
                name: w[i]["name"],
                priceUsd: w[i]["priceUsd"],
                supply:  w[i]["supply"],
                maxSupply:  w[i]["maxSupply"] === null ? "Not available" : w[i]["maxSupply"],
                rank: w[i]["rank"]
            };
            currencyDetails.push(currencyObject);
        }
        console.log(currencyDetails.length);
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
});

app.get("/", function(req, res){
    if(req.isAuthenticated()){
        res.render("home", {currencies: currencyDetails});
    }else{
        res.sendFile(__dirname+"/index.html");  
    }
});

app.get("/currency/:name/:supply/:usd/:rank/:maxSupply", function(req, res){
    res.render("currency", {name: req.params.name, 
                            supply: req.params.supply, 
                            maxSupply: req.params.maxSupply, 
                            usd: req.params.usd,
                            rank: req.params.rank
                        });
});

app.get("/home", function(req, res){
    if(req.isAuthenticated()){

    }else{
        res.send("Not logged in");
    }
});

app.post("/register", function(req, res){
    console.log(req.body.username);
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/");
            });
        }
    });
});

app.get("/favorites", function(req, res){
    User.findById(req.user._id, function(err, foundUser){
        res.render("profile", {favs: foundUser.favs, email: foundUser.username});
    });
});

app.post("/addToFavorites", function(req, res){
    console.log(req.body.button);
    console.log(req.user.id);
    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            foundUser.favs.push(req.body.button);
            foundUser.save(function(){
                res.redirect("/");
            });
        }
    });
});

app.listen(3000, function(){
    console.log("Listening at port 3000");
});