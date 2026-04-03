// User model - defines what a "User" looks like in our database
// We use Mongoose Schema to describe the structure

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // bcrypt is used to hash passwords securely

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,     // no two users can have the same username
      trim: true,       // removes extra spaces
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username can be at most 30 characters']
    },

    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,  // always store emails in lowercase
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },

    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false     // this field won't be returned in queries by default (security!)
    },

    // Role controls what the user is allowed to do
    role: {
      type: String,
      enum: ['viewer', 'analyst', 'admin'], // only these 3 values are allowed
      default: 'viewer'  // new users start as viewers
    },

    // Status lets admins deactivate a user without deleting them
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true  // automatically adds createdAt and updatedAt fields
  }
);

// --- Hash password before saving to database ---
// We never store plain text passwords - that's a huge security risk!
// This runs automatically before every .save()
//
// Use async/Promise style so Mongoose doesn't require a `next` callback.
userSchema.pre('save', async function () {
  // Only hash if the password was actually changed
  if (!this.isModified('password')) return;

  // 12 is the "salt rounds" - higher = more secure but slower
  this.password = await bcrypt.hash(this.password, 12);
});

// --- Method to check if a password is correct during login ---
// We compare the entered password with our stored hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// --- Remove password from any JSON response ---
// Even if select:false fails, this is a backup to never send the password
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);