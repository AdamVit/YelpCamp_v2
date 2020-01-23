const express = require('express'),
	  router = express.Router(),
	  passport = require('passport'),
	  User = require("../models/user"),
	  Notification = require("../models/notification"),
	  Campground = require("../models/campground"),
      sasync = require("async"),
	  nodemailer = require("nodemailer"),
	  crypto = require("crypto"),
	  middleware = require("../middleware");

//root route
router.get("/", function(req, res){
	res.render("landing");
});

//show register form
router.get("/register", function(req, res){
	res.render("users/register", {page: "register"});
});

//sing up logic
router.post("/register", function(req, res){
	var newUser = new User({
			username: req.body.username, 
			firstName: req.body.firstName, 
			lastName: req.body.lastName,
			email: req.body.email,
			avatar: req.body.avatar
		});
	
	if(req.body.adminCode === "secretcode123"){
		newUser.isAdmin = true;
	};
	User.register(newUser, req.body.password, function(err, user){
		if(err){
			req.flash("error", err.message);
  			return res.redirect("/register");
		}
		passport.authenticate("local")(req, res, function(){
			req.flash("success", "Welcome to YelpCamp " + user.username);
			res.redirect("/campgrounds");
		});
	});
});

//show login form
router.get("/login", function(req, res){
	res.render("users/login", {page: "login"});
});

//handeling login logic
router.post("/login", passport.authenticate("local", 
	{
		successRedirect: "/campgrounds",
		failureRedirect: "/login",
		failureFlash: true,
        successFlash: 'Welcome to YelpCamp!'
	})
);

//logout route
router.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "You have been logged out!");
	res.redirect("/campgrounds");
});

//forgot password route
router.get("/forgot", function(req, res){
	res.render("users/forgot");
});

router.post('/forgot', function(req, res, next) {
  sasync.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 1800000; // 30 minutes

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'avitek123@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'avitek123@gmail.com',
        subject: 'YelpCamp Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('Email sent!');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/login');
  });
});

//reset password route
router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  sasync.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'avitek123@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'avitek123@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});

//view user's profile
router.get('/users/:id', async function(req, res) {
  try {
    let user = await User.findById(req.params.id).populate('followers').exec();
	//show campgrounds of found user  
	Campground.find().where("author.id").equals(user._id).exec(function(err, campgrounds){	
    res.render('users/show', { user, campgrounds, page: 'user' });
	});	
  } catch(err) {
    req.flash('error', "Something went wrong!");
    return res.redirect('back');
  }
});

// follow user
router.get('/follow/:id', middleware.isLoggedIn, async function(req, res) {
  try {
    let user = await User.findById(req.params.id);
    user.followers.push(req.user._id);
    user.save();
    req.flash('success', 'Successfully followed ' + user.username + '!');
    res.redirect('/users/' + req.params.id);
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

// view all notifications
router.get('/notifications', middleware.isLoggedIn, async function(req, res) {
  try {
    let user = await User.findById(req.user._id).populate({
      path: 'notifications',
      options: { sort: { "_id": -1 } }
    }).exec();
    let allNotifications = user.notifications;
    res.render('notifications/index', { allNotifications, page: 'notifications'});
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

// handle notification
router.get('/notifications/:id', middleware.isLoggedIn, async function(req, res) {
  try {
    let notification = await Notification.findById(req.params.id);
    notification.isRead = true;
    notification.save();
    res.redirect(`/campgrounds/${notification.campgroundId}`);
  } catch(err) {
    req.flash('error', err.message);
    res.redirect('back');
  }
});

module.exports = router;