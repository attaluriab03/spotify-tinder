const express = require("express");
const request = require("request");
const crypto = require("crypto");
const cors = require("cors");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();

const client_id = process.env.CLIENT_ID; // Spotify clientId
const client_secret = process.env.CLIENT_SECRET; // Spotify secret
const redirect_uri = "http://localhost:8000/callback"; // Your redirect URI

const db = require("./firebase"); // Firebase Firestore
const {
  collection,
  getDocs,
  query,
  where,
  addDoc,
} = require("firebase/firestore");

const app = express();
const stateKey = "spotify_auth_state";

// Generate a random string for state validation
const generateRandomString = (length) => {
  return crypto.randomBytes(60).toString("hex").slice(0, length);
};

app.use(express.static(__dirname + "/public"))
   .use(cors())
   .use(cookieParser());

// Login endpoint
app.get("/login", function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope = "user-read-private user-read-email user-top-read";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        show_dialog: true, // Ensures fresh login
      })
  );
});

// Callback endpoint after Spotify authentication
app.get("/callback", function (req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    res.clearCookie(stateKey);

    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
      json: true,
    };

    request.post(authOptions, async function (error, response, body) {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;

        // Get user info from Spotify
        const options = {
          url: "https://api.spotify.com/v1/me",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(options, async function (error, response, body) {
          const user_id = body.id;
          const user_name = body.display_name;

          // Add user info to Firebase Firestore
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            await addDoc(collection(db, "users"), {
              public: true,
              username: body.display_name,
              profilepic: body.images[0] ? body.images[0].url : null,
              followercount: body.followers.total,
              userid: body.id,
            });
          }

          // Redirect with tokens to frontend
          res.redirect(
            "http://localhost:5173/#" +
              querystring.stringify({
                access_token: access_token,
                refresh_token: refresh_token,
                user_id: user_id,
                user_name: user_name,
              })
          );
        });
      } else {
        res.redirect(
          "/#" +
            querystring.stringify({
              error: "invalid_token",
            })
        );
      }
    });
  }
});

// Refresh token endpoint
app.get("/refresh_token", function (req, res) {
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.send({
        access_token: access_token,
      });
    }
  });
});

/* --------------------------------- EXPRESS ROUTES ------------------------------------- */
app.use(express.json());

const userRouter = require("./users");

app.use("/users", userRouter);
/* ---------------------------------------------------------------------------------------- */

app.listen(8000, () => {
  console.log("Listening on 8000");
});
