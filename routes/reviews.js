const express = require("express"),
 	  router = express.Router({mergeParams: true}),
	  Campground = require("../models/campground"),
 	  Review = require("../models/review"),
 	  middleware = require("../middleware");

// Reviews Index
router.get("/", function (req, res) {
    Campground.findOne({slug: req.params.slug}).populate({
        path: "reviews",
        options: {sort: {createdAt: -1}} // sorting the populated reviews array to show the latest first
    }).exec(function (err, campground) {
        if (err || !campground) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/index", {campground});
    });
});

// Reviews New
router.get("/new", middleware.isLoggedIn, middleware.checkReviewExistence, function (req, res) {
    // middleware.checkReviewExistence checks if a user already reviewed the campground, only one review per user is allowed
    Campground.findOne({slug: req.params.slug}, function (err, campground) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/new", {campground});
    });
});

// Reviews Create
router.post("/", middleware.isLoggedIn, middleware.checkReviewExistence, function (req, res) {
	//lookup campground
	Campground.findOne({slug: req.params.slug}).populate("reviews").exec(function (err, campground) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		//create the review
		Review.create(req.body.review, function (err, review) {
			if (err) {
				req.flash("error", err.message);
				return res.redirect("back");
			}
			//add author username/id and associated campground to the review
			review.author.id = req.user._id;
			review.author.username = req.user.username;
			review.campground = campground;
			//save review
			review.save();
			campground.reviews.push(review);
			// calculate the new average review for the campground
			campground.rating = middleware.calculateAverage(campground.reviews);
			//save campground
			campground.save();
			req.flash("success", "Your review has been successfully added.");
			res.redirect('/campgrounds/' + campground.slug);
		});
    });
});

// Reviews Edit
router.get("/:review_id/edit", middleware.checkReviewOwnership, function (req, res) {
	Review.findById(req.params.review_id, function (err, foundReview) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		res.render("reviews/edit", {campground_slug: req.params.slug, review: foundReview});
	});
});

// Reviews Update
router.put("/:review_id", middleware.checkReviewOwnership, function (req, res) {
	Review.findByIdAndUpdate(req.params.review_id, req.body.review, {new: true}, function (err, updatedReview) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		Campground.findOne({slug: req.params.slug}).populate("reviews").exec(function (err, campground) {
			if (err) {
				req.flash("error", err.message);
				return res.redirect("back");
			}
			// recalculate campground average
			campground.rating = middleware.calculateAverage(campground.reviews);
			//save changes
			campground.save();
			req.flash("success", "Your review was successfully edited.");
			res.redirect('/campgrounds/' + campground.slug);
		});
	});
});

// Reviews Delete
router.delete("/:review_id", middleware.checkReviewOwnership, function (req, res) {
	Review.findByIdAndRemove(req.params.review_id, function (err) {
		if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		Campground.findOneAndUpdate({slug: req.params.slug}, {$pull: {reviews: req.params.review_id}}, 
			{new: true}).populate("reviews").exec(function (err, campground){
				if (err) {
					req.flash("error", err.message);
					return res.redirect("back");
				}
			// recalculate campground average
			campground.rating = middleware.calculateAverage(campground.reviews);
			//save changes
			campground.save();
			req.flash("success", "Your review was deleted successfully.");
			res.redirect("/campgrounds/" + req.params.slug);
		});
	});
});

module.exports = router;