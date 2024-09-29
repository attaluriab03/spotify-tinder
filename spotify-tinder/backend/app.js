var express = require("express");
var request = require("request");
var crypto = require("crypto");
var cors = require("cors");
var querystring = require("querystring");
var cookieParser = require("cookie-parser");

require("dotenv").config();
var client_id = process.env.CLIENT_ID; // your clientId
var client_secret = process.env.CLIENT_SECRET; // Your secret
var redirect_uri = "http://localhost:8000/callback"; // Your redirect uri -> port = 8000

const db = require("./firebase");
const {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  query,
  where,
} = require("firebase/firestore");

const generateRandomString = (length) => {
  return crypto.randomBytes(60).toString("hex").slice(0, length);
};

var stateKey = "spotify_auth_state";

var app = express();

app
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser());

app.get("/login", function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope =
    "user-read-private user-read-email user-top-read user-follow-read user-library-read";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        show_dialog: true, // to make sure you always go to spotify log-in everytime log in button is clicked
      })
  );
});



app.get("/callback", function (req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          new Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: "https://api.spotify.com/v1/me",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        var user_id = null;

        // use the access token to access the Spotify Web API
        request.get(options, async function (error, response, body) {
          // adding info from JSON returned when you log in
          var user_name = body.display_name;
          user_id = body.id;

          // we can also pass the token to the browser to make requests from there
          res.redirect(
            "http://localhost:3000/#" +
              querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token,
                user_id: user_id,
                user_name: user_name,
              })
          );

          // add user info to firebase
          try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("userid", "==", user_id));
            const querySnapshot = await getDocs(q);

            if(querySnapshot.empty){
              await addDoc(collection(db, "users"), {
                public: true,
                username: body.display_name,
                profilepic: body.images[1] ? body.images[1].url : null,
                followercount: body.followers.total,
                userid: body.id,
              });
            }            
          } catch (e) {
            console.error("Error adding user: ", e);
          }
        });        
      } else {
        res.redirect(
          "http://localhost:3000/#" +
            querystring.stringify({
              error: "invalid_token",
            })
        );
      }
    });
  }
});

app.get("/refresh_token", function (req, res) {
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        new Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
        refresh_token = body.refresh_token;
      res.send({
        access_token: access_token,
        refresh_token: refresh_token,
      });
    }
  });
});

app.get("/recommendations", function (req, res) {
  var access_token = req.query.access_token;
  var seed_tracks = req.query.seed_tracks; // comma-separated list of Spotify track IDs

  if (!access_token) {
    return res.status(400).json({ error: "Access token is required" });
  }

  if (!seed_tracks) {
    return res.status(400).json({ error: "Seed track is required" });
  }

  var authOptions = {
    url: "https://api.spotify.com/v1/recommendations",
    qs: {
      seed_tracks: seed_tracks, // Using the track ID that was swiped right
      limit: 10, // Fetch 10 new recommendations
    },
    headers: {
      Authorization: "Bearer " + access_token,
    },
    json: true,
  };

  request.get(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      res.json(body);
    } else {
      res.status(response.statusCode).json({ error: "Failed to get recommendations" });
    }
  });
});


/* --------------------------------- EXPRESS ROUTES ------------------------------------- */
app.use(express.json());

const userRouter = require("./users");

app.use("/users", userRouter);
/* ---------------------------------------------------------------------------------------- */

console.log("Listening on 8000");
app.listen(8000); // port -> 8000

