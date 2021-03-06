const mongoose = require('mongoose'),
      passportLocalMongoose = require('passport-local-mongoose');

var UserSchema = new mongoose.Schema({
	username: {type: String, unique: true, required: true},
	password: String,
	notifications: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Notification',
		}	
	],
	followers: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	],
	following: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}	
	],
	avatar: String,
	firstName: String,
	lastName: String,
	email: {type: String, unique: true, required: true},
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	isAdmin: {type: Boolean, default: false}
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);