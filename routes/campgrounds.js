const express = require('express'),
	  router = express.Router(),
	  Campground = require('../models/campground'),
	  Comment = require('../models/comment'),
	  User = require('../models/user'),
	  Notification = require('../models/notification'),
	  Review = require('../models/review'),
	  middleware = require('../middleware');

var NodeGeocoder = require('node-geocoder');
 
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

//INDEX - SHOW ALL CAMPGROUNDS
router.get("/", function(req, res){
	//search campgrounds logic
	if(req.query.search){
		const regex = new RegExp(middleware.escapeRegex(req.query.search), 'gi');
		Campground.find({name: regex}, function(err, allCampgrounds){
			if(err){
				console.log(err)
			} else {
				var noMatch;
				if(allCampgrounds.length < 1){
					noMatch = "Sorry, there are no campgrounds with that name, please try again."
				}
				res.render("campgrounds/index", {campgrounds: allCampgrounds, noMatch: noMatch, page: "campgrounds"});
			}
		});
	} else {
		//all campgrounds from database
		Campground.find({}, function(err, allCampgrounds){
			if(err){
				console.log(err, "Error");
			} else {
				res.render("campgrounds/index", {campgrounds: allCampgrounds, noMatch: undefined, page: "campgrounds"});
			}
		});
	}
});

//NEW ROUTE
router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new");
});

//CREATE ROUTE
router.post("/", middleware.isLoggedIn, function(req, res){
	//get data from form and add to campground array
	var name = req.body.name;
	var price = req.body.price;
	var image = req.body.image;
	var desc = req.body.description;
	var author = {
		id: req.user._id,
		username: req.user.username
	};
	geocoder.geocode(req.body.location, async function (err, data) {
		if (err || !data.length) {
		  console.log(err.message);
		  req.flash('error', 'Invalid address');
		  return res.redirect('back');
		}
		var lat = data[0].latitude;
		var lng = data[0].longitude;
		var location = data[0].formattedAddress;
		var newCampground = {name: name, price: price, image: image, description: desc, author: author, location: location, lat: lat, lng: lng};
		//create a new campground and save to DB
		try {
		  let campground = await Campground.create(newCampground);
		  let user = await User.findById(req.user._id).populate('followers').exec();
		  let newNotification = {
			username: req.user.username,
			campgroundId: campground.id
		  }
		  for(const follower of user.followers) {
			let notification = await Notification.create(newNotification);
			follower.notifications.push(notification);
			follower.save();
		  }

		  //redirect back to campgrounds page
		  res.redirect(`/campgrounds/${campground.id}`);
		  } catch(err) {
		  req.flash('error', err.message);
		  res.redirect('back');
		}
	});
});

//SHOW ROUTE - shows more info about one campground
router.get("/:id", function(req, res){
	//find the campground with id
	Campground.findById(req.params.id).populate("comments likes").populate({
		path: "reviews",
        options: {sort: {createdAt: -1}}
	}).exec(function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found!");
			res.redirect("back");
		} else {
			//render show template with that campground
			res.render("campgrounds/show", {campground: foundCampground});			
		}
	});
});

//EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, function(err, foundCampground){
		res.render("campgrounds/edit", {campground: foundCampground});
	}); 
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res){
  delete req.body.campground.rating;
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
	  console.log(err);	
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;

    Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);
        }
    });
  });
});

// CAMPGROUND LIKE ROUTE
router.post("/:id/like", middleware.isLoggedIn, function(req, res){
    try {
		Campground.findById(req.params.id, function(err, foundCampground){
			if(err){
				console.log(err);
				return res.redirect("/campgrounds");
			}
			// check if req.user._id exists in foundCampground.likes
			var foundUserLike = foundCampground.likes.some(function(like){
				return like.equals(req.user._id);
			});
			if(foundUserLike){
				// user already liked, removing like
				foundCampground.likes.pull(req.user._id);
			} else {
				// adding the new user like
				foundCampground.likes.push(req.user);
			}
			foundCampground.save(function(err){
				if(err){
					console.log(err);
					return res.redirect("/campgrounds");
				}
				return res.redirect("/campgrounds/" + foundCampground._id);
			});
    	});	
	} catch(err){
		req.flash("error","Something went wrong");
		console.log(err.message);
		return res.redirect("back");
	}
});

//DESTROY CAMPRGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function (req, res) {
    Campground.findById(req.params.id, function (err, campground) {
        if (err) {
            res.redirect("/campgrounds");
        } else {
            // deletes all comments associated with the campground
            Comment.remove({"_id": {$in: campground.comments}}, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.remove({"_id": {$in: campground.reviews}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                    //  delete the campground
                    campground.remove();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/campgrounds");
                });
            });
        }
    });
});

module.exports = router;