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

        // Fetch top year artists
        var topArtistsYear = {
          url: "https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=20&offset=0",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(topArtistsYear, async function (error, response, body) {
          if (error) {
            console.error("Error:", error);
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));

          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userToUpdate = querySnapshot.docs[0].id;

              var allTopArtistInfo = body.items;
              var artistInfoToPush = [];
              allTopArtistInfo.map((artist) =>
                artistInfoToPush.push({
                  artistimage: artist.images[0].url,
                  artistname: artist.name,
                  artistid: artist.id,
                })
              );

              updateDoc(doc(db, "users", userToUpdate), {
                topArtistYear: artistInfoToPush,
              });
            }
          } catch (e) {
            console.error("Error getting top artist of year: ", e);
          }
        });

        // Fetch top 6 month artists
        var topArtistsHalfYear = {
          url: "https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=20&offset=0",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(topArtistsHalfYear, async function (error, response, body) {
          if (error) {
            console.error("Error:", error);
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));

          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userToUpdate = querySnapshot.docs[0].id;

              var allTopArtistInfo = body.items;
              var artistInfoToPush = [];
              allTopArtistInfo.map((artist) =>
                artistInfoToPush.push({
                  artistimage: artist.images[0].url,
                  artistname: artist.name,
                  artistid: artist.id,
                })
              );

              updateDoc(doc(db, "users", userToUpdate), {
                topArtistHalfYear: artistInfoToPush,
              });
            }
          } catch (e) {
            console.error("Error getting top artist 6 month: ", e);
          }
        });

        // Fetch top month artist
        var topArtistsMonth = {
          url: "https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=20&offset=0",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(topArtistsMonth, async function (error, response, body) {
          if (error) {
            console.error("Error:", error);
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));

          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userToUpdate = querySnapshot.docs[0].id;

              var allTopArtistInfo = body.items;
              var artistInfoToPush = [];
              allTopArtistInfo.map((artist) =>
                artistInfoToPush.push({
                  artistimage: artist.images[0].url,
                  artistname: artist.name,
                  artistid: artist.id,
                })
              );

              updateDoc(doc(db, "users", userToUpdate), {
                topArtistMonth: artistInfoToPush,
              });
            }
          } catch (e) {
            console.error("Error getting top artist month: ", e);
          }
        });

        // Fetch top year songs
        var topSongYear = {
          url: "https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=20&offset=0",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(topSongYear, async function (error, response, body) {
          if (error) {
            console.error("Error:", error);
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));

          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userToUpdate = querySnapshot.docs[0].id;

              var allTopSongsInfo = body.items;
              var songInfoToPush = [];
              allTopSongsInfo.map((song) =>
                songInfoToPush.push({
                  albumimage: song.album.images[0].url,
                  songname: song.name,
                  artistname: song.artists,
                  songid: song.id,
                })
              );

              updateDoc(doc(db, "users", userToUpdate), {
                topSongYear: songInfoToPush,
              });
            }
          } catch (e) {
            console.error("Error getting top song of year: ", e);
          }
        });

        // Fetch top 6 months songs
        var topSongHalfYear = {
          url: "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=20&offset=0",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(topSongHalfYear, async function (error, response, body) {
          if (error) {
            console.error("Error:", error);
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));

          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userToUpdate = querySnapshot.docs[0].id;

              var allTopSongsInfo = body.items;
              var songInfoToPush = [];
              allTopSongsInfo.map((song) =>
                songInfoToPush.push({
                  albumimage: song.album.images[0].url,
                  songname: song.name,
                  artistname: song.artists,
                  songid: song.id,
                })
              );

              updateDoc(doc(db, "users", userToUpdate), {
                topSongHalfYear: songInfoToPush,
              });
            }
          } catch (e) {
            console.error("Error getting top song of 6 months: ", e);
          }
        });

        // Fetch top months songs
        var topSongMonth = {
          url: "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=20&offset=0",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(topSongMonth, async function (error, response, body) {
          if (error) {
            console.error("Error:", error);
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));

          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userToUpdate = querySnapshot.docs[0].id;

              var allTopSongsInfo = body.items;
              var songInfoToPush = [];
              allTopSongsInfo.map((song) =>
                songInfoToPush.push({
                  albumimage: song.album.images[0].url,
                  albumname: song.album.name,
                  songname: song.name,
                  artistname: song.artists,
                  songid: song.id,
                })
              );

              updateDoc(doc(db, "users", userToUpdate), {
                topSongMonth: songInfoToPush,
              });
            }
          } catch (e) {
            console.error("Error getting top song of the month: ", e);
          }
        });

        // Fetch followed artist
        var followedArtists = {
          url: "https://api.spotify.com/v1/me/following?type=artist&limit=25",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(followedArtists, async function (error, response, body) {
          if (error) {
            console.error("Error followed Artists:", error);
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));

          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userToUpdate = querySnapshot.docs[0].id;

              var allFollowedArtists = body.artists.items;
              var artistInfoToPush = [];
              allFollowedArtists.map((artist) =>
                artistInfoToPush.push({
                  artistimage: artist.images[0].url,
                  artistname: artist.name,
                  artistid: artist.id,
                })
              );

              updateDoc(doc(db, "users", userToUpdate), {
                followedArtistsCount: body.artists.total,
                allFollowedArtists: artistInfoToPush,
              });
            }
          } catch (e) {
            console.error("Error getting followed artists: ", e);
          }
        });

        // Fetch saved albums
        var allAlbums = {
          url: "https://api.spotify.com/v1/me/albums?limit=25&offset=0",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(allAlbums, async function (error, response, body) {
          if (error) {
            console.error("Error for all albums:", error);
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));

          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userToUpdate = querySnapshot.docs[0].id;

              var allAlbums = body.items;
              var albumInfoToPush = [];
              allAlbums.map((album) =>
                albumInfoToPush.push({
                  albumname: album.album.name,
                  albumimage: album.album.images[0].url,
                  artistname: album.album.artists,
                  albumid: album.album.id,
                })
              );

              updateDoc(doc(db, "users", userToUpdate), {
                savedalbums: albumInfoToPush,
              });
            }
          } catch (e) {
            console.error("Error getting saved albums: ", e);
          }
        });

        // Fetch saved songs
        var allSongs = {
          url: "https://api.spotify.com/v1/me/tracks?limit=30",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.get(allSongs, async function (error, response, body) {
          if (error) {
            console.error("Error for all songs:", error);
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userid", "==", user_id));

          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userToUpdate = querySnapshot.docs[0].id;

              var allSongsInfo = body.items;
              var allSongsInfoToPush = [];
              allSongsInfo.map((song) =>
                allSongsInfoToPush.push({
                  albumimage: song.track.album.images[0].url,
                  albumname: song.track.album.name,
                  artistname: song.track.artists,
                  songname: song.track.name,
                  songid: song.track.id,
                })
              );

              updateDoc(doc(db, "users", userToUpdate), {
                allsongs: allSongsInfoToPush,
              });
            }
          } catch (e) {
            console.error("Error getting all songs info: ", e);
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

/* --------------------------------- EXPRESS ROUTES ------------------------------------- */
app.use(express.json());

const userRouter = require("./users");

app.use("/users", userRouter);
/* ---------------------------------------------------------------------------------------- */

console.log("Listening on 8000");
app.listen(8000); // port -> 8000

