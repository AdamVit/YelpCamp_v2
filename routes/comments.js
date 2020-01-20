const express = require('express'),
	  router = express.Router({mergeParams: true}),
	  Campground = require('../models/campground'),
	  Comment = require('../models/comment'),
	  middleware = require('../middleware');

//Comments New
router.get("/new", middleware.isLoggedIn, function(req, res){
	//find campground 
	Campground.findOne({slug: req.params.slug}, function(err, campground){
		if(err){
			req.flash("error", "Something went wrong!");
			console.log(err);
		} else {	
			res.render("comments/new", {campground});
		}
	});
});

//Comments Create
router.post("/", middleware.isLoggedIn, function(req, res){
	//lookup campground using id
	Campground.findOne({slug: req.params.slug}, function(err, campground){
		if(err){
			req.flash("error", "Something went wrong!");
			console.log(err.message);
			res.redirect("/campgrounds");
		} else {
			Comment.create(req.body.comment, function(err, comment){
				if(err){
					req.flash("error", "Something went wrong!");
					console.log(err);
				} else {
					//add username and id to comment
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					//save comment
					comment.save();
					campground.comments.push(comment);
					campground.save();
					req.flash("success", "Successfully added a comment!");
					res.redirect("/campgrounds/" + campground.slug);
				}
			});
		}
	});
});

//Comments edit route
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res){
	Campground.findOne({slug: req.params.slug}, function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "No campground found!");
			return res.redirect("back");
		}
		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(err){
				req.flash("error", "Something went wrong!");
				res.redirect("back");
			} else {
				res.render("comments/edit", {campground_slug: req.params.slug, comment: foundComment});
			}
		});
	});
});

//Comments update route
router.put("/:comment_id", middleware.checkCommentOwnership, function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err){
		if(err){
			req.flash("error", "Something went wrong!");
			res.redirect("back");
		} else {
			res.redirect("/campgrounds/" + req.params.slug)
		}
	});
});

//Comments destroy route
router.delete("/:comment_id", middleware.checkCommentOwnership, function(req, res){
	//find by id and remove comment
	Comment.findByIdAndRemove(req.params.comment_id, function(err){
		if(err){
			req.flash("error", "Something went wrong!");
			res.redirect("back");
		} else {
			req.flash("success", "Comment deleted!");
			res.redirect("/campgrounds/" + req.params.slug);
		}
	});
});

module.exports = router;