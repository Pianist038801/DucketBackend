var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    _id: Schema.Types.ObjectId,
    username: String,
    password: String,
    email: String,
    phone :String,
    friends : String,
    requestfriendlist : String,
    requiredfriendlist : String,
    isLoggedIn : Boolean,
    deviceToken : String,
    osType : String,
});

userSchema.methods.FindByEmail = function(done){
    return this.model('user').find({ email : this.email },done);
}

userSchema.methods.FindByPhone = function(done){
    return this.model('user').find({ phone : this.phone },done);
}

userSchema.methods.FindByUserName = function(done){
    return this.model('user').find({ username : this.username },done);
}

var user_info = mongoose.model('user', userSchema);

module.exports = user_info;