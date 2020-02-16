require('dotenv').config();

const express			= require('express'),
	  app				= express(),
	  bodyParser		= require('body-parser'),
	  mongoose			= require('mongoose'),
	  flash				= require('connect-flash'),
	  passport			= require('passport'),
	  LocalStrategy		= require('passport-local'),
	  methodOverride	= require('method-override'),
	  Campground		= require('./models/campground'),
	  Comment			= require('./models/comment'),
	  User				= require('./models/user'),
	  seedDB			= require('./seeds');

//requring routes
const commentRoutes		= require('./routes/comments'),
	  reviewRoutes		= require('./routes/reviews'),
	  campgroundRoutes	= require('./routes/campgrounds'),
	  indexRoutes		= require('./routes/index');

mongoose.connect(/*'mongodb://localhost:27017/yelp_camp' - internal database */`mongodb+srv://dbYelpCamp:${process.env.CLOUDINARY_DB_PSW}@cluster0-ksn6w.mongodb.net/test?retryWrites=true&w=majority`, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true}).then(() => {
	console.log('Connected to DB');
}).catch(err => {
	console.log("Error", err.message);
});
mongoose.set('useFindAndModify', false);
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require('moment');
//seedDB(); //seed the database

//PASSPORT CONFIGURATION
app.use(require('express-session')({
	secret: "Stephan Carol is a genius",
	resave: false,
	saveUninitialized: false,
	cookie: { maxAge: 3600000 } // 1 hour  session
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(async function(req, res, next){
	res.locals.currentUser = req.user;
	if(req.user){
		try{
			let user = await User.findById(req.user._id).populate("notifications", null, {isRead: false}).exec();
			res.locals.notifications = user.notifications.reverse();
		} catch(err){
			console.log(err.message);
		}
	};
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:slug/comments", commentRoutes);
app.use("/campgrounds/:slug/reviews", reviewRoutes);

app.listen(process.env.PORT || 3000, function(){
	console.log("YelpCamp Server has started")
});