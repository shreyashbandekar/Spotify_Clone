//Load Models
const Account = require('../models/Account');
const Songs = require('../models/Songs');
const Artist = require('../models/Artist');
const User = require('../models/User');

const { json } = require('body-parser');

const data = {
    userName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    password2: '',
};

// Load index page view
exports.getIndex = (req, res, next) => {
    if (!req.session.loggedinUser) {
        return res.render('register', {
            title: 'Spotify - Register',
            formData: data,
            loginUsername: '',
            baseURL: process.env.BASE_URL,
        });
    }

    //Get all albums
    Songs.fetchAllAlbums()
        .then((result) => {
            result = Object.values(JSON.parse(JSON.stringify(result[0])));
            res.render('index', {
                title: 'Spotify',
                albums: result,
                loggedInUser: req.session.loggedinUserFullName,
                isAjaxRequest: req.xhr,
                baseURL: process.env.BASE_URL,
            });
        })
        .catch((e) => {
            res.redirect('/500');
        });
};

// Register page view
exports.getRegister = (req, res, next) => {
    try {
        res.render('register', {
            title: 'Spotify - Register',
            formData: data,
            loginUsername: '',
            baseURL: process.env.BASE_URL,
        });
    } catch (e) {
        res.redirect('/500');
    }
};

// Single Album Details Page
exports.getAlbum = (req, res, next) => {
    if (!req.session.loggedinUser) {
        return res.render('register', {
            title: 'Spotify - Register',
            formData: data,
            loginUsername: '',
            baseURL: process.env.BASE_URL,
        });
    }

    const albumID = req.query.id;
    if (albumID) {
        let songs = new Songs();

        let userPlaylist;
        //Get Users playlists
        getUserPlaylists(req.session.loggedinUser)
            .then((playlist) => {
                userPlaylist = playlist;
                return songs.getAllAlbumDetails(albumID);
            })
            .then((result) => {
                if (!result) {
                    res.redirect('/');
                } else {
                    // console.log(result.albumDet);
                    res.render('album', {
                        title: 'Spotify - Album Details',
                        data: result,
                        loggedInUser: req.session.loggedinUserFullName,
                        isAjaxRequest: req.xhr,
                        userPlaylist: userPlaylist,
                        baseURL: process.env.BASE_URL,
                    });
                }
            })
            .catch((e) => {
                res.redirect('/500');
            });
    } else {
        res.redirect('/');
    }
};

// Artist view
exports.getArtist = (req, res, next) => {
    if (!req.session.loggedinUser) {
        return res.render('register', {
            title: 'Spotify - Register',
            formData: data,
            loginUsername: '',
            baseURL: process.env.BASE_URL,
        });
    }

    const artistID = req.query.id;
    if (artistID) {
        const artist = new Artist(artistID);

        let userPlaylist;
        //Get Users playlists
        getUserPlaylists(req.session.loggedinUser)
            .then((playlist) => {
                userPlaylist = playlist;
                return artist.getArtistPageDetails();
            })
            .then((result) => {
                res.render('artist', {
                    title: 'Spotify - Artist Details',
                    loggedInUser: req.session.loggedinUserFullName,
                    isAjaxRequest: req.xhr,
                    data: result,
                    userPlaylist: userPlaylist,
                    baseURL: process.env.BASE_URL,
                });
            })
            .catch((e) => {
                res.redirect('/500');
            });
    } else {
        res.redirect('/');
    }
};

//Search View
exports.getSearch = (req, res, next) => {
    if (!req.session.loggedinUser) {
        return res.render('register', {
            title: 'Spotify - Register',
            formData: data,
            loginUsername: '',
            baseURL: process.env.BASE_URL,
        });
    }

    let term = decodeURIComponent(req.query.term); //decodeURI will remove encoded whitespaces from URL params
    if (term === 'undefined') {
        term = '';
    }

    const userLoggedInIndex = term.indexOf('userLoggedIn'); //Remove extra params
    if (userLoggedInIndex !== -1) {
        term = term.substr(0, userLoggedInIndex - 1);
    }

    const artist = new Artist();
    let output = {};

    let userPlaylist;
    //Get Users playlists
    getUserPlaylists(req.session.loggedinUser)
        .then((playlist) => {
            userPlaylist = playlist;
            return artist.searchSongs(term);
        })
        .then((result) => {
            output.songsList = result;
            return artist.searchArtists(term); //Search artists
        })
        .then((artists) => {
            output.artistList = artists;
            return artist.searchAlbums(term); //Search Albums
        })
        .then((albums) => {
            output.albumList = albums;
            res.render('search', {
                title: 'Spotify | Search',
                data: output,
                loggedInUser: req.session.loggedinUserFullName,
                isAjaxRequest: req.xhr,
                term: term,
                userPlaylist: userPlaylist,
                baseURL: process.env.BASE_URL,
            });
        })
        .catch((e) => {
            res.redirect('/500');
        });
};

//Your Music View
exports.getYourMusic = (req, res, next) => {
    if (!req.session.loggedinUser) {
        return res.render('register', {
            title: 'Spotify - Register',
            formData: data,
            loginUsername: '',
        });
    }

    const user = new User(req.session.loggedinUser);
    user.getUserPlaylist()
        .then((result) => {
            res.render('yourMusic', {
                title: 'Spotify | Your Music',
                loggedInUser: req.session.loggedinUserFullName,
                isAjaxRequest: req.xhr,
                userPlaylists: result,
                baseURL: process.env.BASE_URL,
            });
        })
        .catch((e) => {
            res.redirect('/500');
        });
};

//Get Single Playlist Details Page
exports.getPlaylistView = (req, res, next) => {
    if (!req.session.loggedinUser) {
        return res.render('register', {
            title: 'Spotify - Register',
            formData: data,
            loginUsername: '',
            baseURL: process.env.BASE_URL,
        });
    }

    const playlistId = req.query.id;

    let details = {};
    const user = new User();

    let userPlaylist;
    //Get Users all playlists
    getUserPlaylists(req.session.loggedinUser)
        .then((playlist) => {
            userPlaylist = playlist;
            return user.getPlaylistbyID(playlistId);
        })
        .then((result) => {
            details.playListName = result.name;
            details.playListUser = req.session.loggedinUserFullName;
            return user.getPlaylistSongs(playlistId);
        })
        .then((playlistSongs) => {
            details.songsCount = playlistSongs.length;
            details.songsList = playlistSongs;
            res.render('playlist', {
                title: 'Spotify | Playlist',
                loggedInUser: req.session.loggedinUserFullName,
                isAjaxRequest: req.xhr,
                data: details,
                playlistId: playlistId,
                userPlaylist: userPlaylist,
                baseURL: process.env.BASE_URL,
            });
        })
        .catch((e) => {
            res.redirect('/500');
        });
};

//Get User Profile Page
exports.getProfile = (req, res, next) => {
    try {
        if (!req.session.loggedinUser) {
            return res.render('register', {
                title: 'Spotify - Register',
                formData: data,
                loginUsername: '',
            });
        }

        res.render('userProfile', {
            title: 'Spotify | Profile',
            loggedInUser: req.session.loggedinUserFullName,
            isAjaxRequest: req.xhr,
            username: req.session.loggedinUser,
            baseURL: process.env.BASE_URL,
        });
    } catch (e) {
        res.redirect('/500');
    }
};

//Get Profile Edit Page
exports.getupdateDetails = (req, res, next) => {
    if (!req.session.loggedinUser) {
        return res.render('register', {
            title: 'Spotify - Register',
            formData: data,
            loginUsername: '',
            baseURL: process.env.BASE_URL,
        });
    }

    const user = new User(req.session.loggedinUser);
    user.getUserDetails()
        .then((result) => {
            res.render('updateDetails', {
                title: 'Spotify | Edit Profile',
                loggedInUser: req.session.loggedinUserFullName,
                isAjaxRequest: req.xhr,
                data: result,
                baseURL: process.env.BASE_URL,
            });
        })
        .catch((e) => {
            res.redirect('/500');
        });
};

/**------- Post Requests -----------**/
//login request
exports.login = (req, res, next) => {
    const username = req.body.loginUsername;
    const password = req.body.loginPassword;

    const account = new Account();

    account
        .login(username, password)
        .then((result) => {
            if (result.status === 'failed') {
                res.render('register', {
                    title: 'Spotify - Register',
                    errorsObj: account,
                    formData: data,
                    loginUsername: username,
                    src: 'login',
                    baseURL: process.env.BASE_URL,
                });
            } else {
                req.session.loggedinUser = username;
                req.session.loggedinUserFullName = result.userFullName;
                res.redirect('/');
            }
        })
        .catch((e) => {
            res.redirect('/500');
        });
};

// Register POST
exports.register = (req, res, next) => {
    const username = stripTags(req.body.username);
    const firstname = stripTags(req.body.firstName);
    const lastname = stripTags(req.body.lastName);
    const email = stripTags(req.body.email);
    const password = stripTags(req.body.password);
    const password2 = stripTags(req.body.password2);

    const account = new Account();

    account
        .register(username, firstname, lastname, email, password, password2)
        .then((result) => {
            if (result) {
                req.session.loggedinUser = username;
                req.session.loggedinUserFullName = `${firstname} ${lastname}`;
                res.redirect('/');
            } else {
                res.render('register', {
                    title: 'Spotify - Register',
                    errorsObj: account,
                    formData: data,
                    loginUsername: username,
                    src: 'reg',
                    baseURL: process.env.BASE_URL,
                });
            }
        })
        .catch((e) => {
            res.redirect('/500');
        });
};

/********** AJAX Calls ******************/
//Get random playlist songs
exports.getPlaylist = (req, res, next) => {
    Songs.getRandomPlaylist()
        .then((result) => {
            let arr = [];
            let resultArray = JSON.parse(JSON.stringify(result[0]));
            resultArray.forEach((data) => {
                arr.push(data.id);
            });

            res.json({ status: 'Success', playlistArray: arr });
        })
        .catch((e) => console.log(e));
};

// Get Song By ID
exports.getSongByID = (req, res, next) => {
    const songID = req.body.songId;
    Songs.getSongByID(songID)
        .then((result) => {
            let resultArr = JSON.parse(JSON.stringify(result[0]));
            res.json({ status: 'Success', songDetails: resultArr[0] });
        })
        .catch((e) => console.log(e));
};

// Get Artist by ID
exports.getArtistByID = (req, res, next) => {
    const artistID = req.body.artistId;
    Songs.getArtistByID(artistID)
        .then((result) => {
            let resultArr = JSON.parse(JSON.stringify(result[0]));
            res.json({ status: 'Success', artistDetails: resultArr[0] });
        })
        .catch((e) => console.log(e));
};

// Get Album By ID
exports.getAlbumByID = (req, res, next) => {
    const albumID = req.body.albumId;
    Songs.getAlbumByID(albumID)
        .then((result) => {
            let resultArr = JSON.parse(JSON.stringify(result[0]));
            res.json({ status: 'Success', albumDetails: resultArr[0] });
        })
        .catch((e) => console.log(e));
};

// Update Song Play Count when song is played
exports.updatePlays = (req, res, next) => {
    const songID = req.body.songid;
    Songs.updateSongPlays(songID)
        .then((result) => {
            res.json({ status: 'Success', res: result });
        })
        .catch((e) => console.log(e));
};

//Create playlist
exports.createPlaylist = (req, res, next) => {
    const username = req.session.loggedinUser;
    const playlistName = req.body.name;

    if (username) {
        const user = new User(username);
        user.createPlaylist(playlistName)
            .then((result) => {
                res.json({ status: 'Success', res: result });
            })
            .catch((e) => console.log(e));
    } else {
        res.json({ status: 'Failure', res: 'Session Expired' });
    }
};

//Delete playlist
exports.deletePlaylist = (req, res, next) => {
    const playlistID = req.body.playlistId;
    const username = req.session.loggedinUser;

    if (username && playlistID) {
        const user = new User(username);
        user.deletePlaylist(playlistID)
            .then((result) => {
                res.json({ status: 'Success', res: result });
            })
            .catch((e) => console.log(e));
    } else {
        res.json({ status: 'Failure', res: 'Session Expired' });
    }
};

//Add song to playlist
exports.addToPlaylist = (req, res, next) => {
    const playlistId = req.body.playlistId;
    const songId = req.body.songId;
    const username = req.session.loggedinUser;

    // console.log(playlistId, songId, username);

    if (playlistId && songId && username) {
        const user = new User(username);
        user.addtoPlaylist(playlistId, songId).then((result) => {
            if (result) {
                res.json({ status: 'Success', res: 'Song added to playlist' });
            } else {
                res.json({ status: 'Failed', res: 'Database Error Occurred' });
            }
        });
    } else {
        res.json({ status: 'Failed', res: 'Required data not found' });
    }
};

//Remove song from playlist
exports.deleteFromPlaylist = (req, res, next) => {
    const playlistId = req.body.playlistId;
    const songId = req.body.songId;
    const username = req.session.loggedinUser;

    if (playlistId && songId && username) {
        const user = new User(username);
        user.deleteSongFromPlaylist(playlistId, songId)
            .then((result) => {
                if (result === true) {
                    return res.json({
                        status: 'Success',
                        res: 'Song removed from playlist successfully',
                    });
                }
                return res.json({
                    status: 'Failed',
                    res: 'Database Operation Failed',
                });
            })
            .catch((e) => console.log(e));
    } else {
        res.json({ status: 'Failed', res: 'Required data not found' });
    }
};

exports.updateUserEmail = (req, res, next) => {
    const username = req.body.username;
    const email = req.body.email;
    if (!username === req.session.loggedinUser && !email) {
        return res.json({ status: 'Failed', res: 'Required data not found' });
    }

    const pattern = /^[a-zA-Z0-9\-_]+(\.[a-zA-Z0-9\-_]+)*@[a-z0-9]+(\-[a-z0-9]+)*(\.[a-z0-9]+(\-[a-z0-9]+)*)*\.[a-z]{2,4}$/;
    if (!pattern.test(email)) {
        return res.json({ status: 'Failed', res: 'Enter Valid Email Address' });
    }

    const user = new User(username);
    user.updateEmail(email)
        .then((result) => {
            if (!result) {
                return res.json({
                    status: 'Failed',
                    res: 'Database Operation Failed',
                });
            }
            res.json({ status: 'Success', res: 'Email Updated Successfully' });
        })
        .catch((e) => {
            console.log(e);
            return res.json({
                status: 'Failed',
                res: 'Database Operation Failed',
            });
        });
};

exports.changeUserPassword = (req, res, next) => {
    const username = req.body.username;
    const oldPassword = req.body.oldPassword;
    const newPassword1 = req.body.newPassword1;
    const newPassword2 = req.body.newPassword2;

    if (!username === req.session.loggedinUser && !oldPassword && !newPassword1 && !newPassword2) {
        return res.json({ status: 'Failed', res: 'Required data not found' });
    }

    if (oldPassword.length < 5 || oldPassword.length > 30) {
        return res.json({
            status: 'Failed',
            res: 'Old Password length should be between 5 to 30 characters',
        });
    }
    if (newPassword1.length < 5 || newPassword1.length > 30) {
        return res.json({
            status: 'Failed',
            res: 'New Password length should be between 5 to 30 characters',
        });
    }
    if (newPassword1 !== newPassword2) {
        return res.json({
            status: 'Failed',
            res: 'New Password not matching with confirm password',
        });
    }
    if (oldPassword === newPassword1) {
        return res.json({
            status: 'Failed',
            res: 'New Password should not match old password',
        });
    }

    const user = new User(username);
    user.checkOldPassword(oldPassword)
        .then((result) => {
            // console.log(result);
            if (result !== true) {
                return res.json({
                    status: 'Failed',
                    res: result,
                });
            }
            //Update New Password Promise
            return user.updatePassword(newPassword1);
        })
        .then((updateRes) => {
            if (updateRes === true) {
                return res.json({
                    status: 'Success',
                    res: 'Password Updated Successfully',
                });
            }
            return res.json({
                status: 'Failed',
                res: 'Database Operation Failed',
            });
        })
        .catch((e) => {
            return res.json({
                status: 'Failed',
                res: 'Database Operation Failed',
            });
        });
};

//Logout User
exports.logout = (req, res, next) => {
    req.session = null;
    return res.json({ status: 'Success', res: 'Loggedout Successfully' });

    // req.session.destroy(function (err) {
    //     return res.json({ status: "Success", res: "Loggedout Successfully" });
    // });
};

/**************/

//Function to get playlist dropdown of the user
function getUserPlaylists(username) {
    const userObj = new User(username);
    return userObj
        .getUserPlaylist()
        .then((resp) => {
            return resp;
        })
        .catch((e) => console.log(e));
}

// remove all html tags if user inserts into text input
const stripTags = (text) => text.replace(/(<([^>]+)>)/gi, '').trim();
