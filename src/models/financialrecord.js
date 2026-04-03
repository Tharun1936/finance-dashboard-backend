// Financial Record model - defines what a transaction looks like in our database
// Each record represents a single income or expense entry

const mongoose = require('mongoose');

const financialRecordSchema = new mongoose.Schema(
  {
    // How much money was involved
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },

    // Is this money coming in or going out?
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Type is required (income or expense)']
    },

    // What is this transaction for? (e.g. "Food", "Salary", "Rent")
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [100, 'Category name is too long']
    },

    // When did this transaction happen?
    date: {
      type: Date,
      default: Date.now  // if no date given, use today
    },

    // Optional notes about the transaction
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description is too long (max 500 chars)']
    },

    // Optional labels like ["monthly", "important"]
    tags: {
      type: [String],
      default: []
    },

    // --- Soft Delete fields ---
    // Instead of permanently deleting, we just mark it as deleted
    // This way we can restore it later if needed
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },

    // Which user created this record?
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',  // this links to the User model
      required: true
    }
  },
  {
    timestamps: true  // auto adds createdAt and updatedAt
  }
);

// --- Database indexes for faster queries ---
// Think of indexes like a book index - makes searching much faster
financialRecordSchema.index({ createdBy: 1, date: -1 });
financialRecordSchema.index({ type: 1, category: 1 });

// --- Auto-filter soft deleted records ---
// Whenever we do a .find(), automatically skip records that are deleted
// So we don't have to remember to add {isDeleted: false} everywhere
financialRecordSchema.pre(/^find/, async function () {
  // In Mongoose, using async/Promise-style hooks avoids relying on a `next` callback.
  // Skip this filter if we specifically opted out (used in restore admin route).
  if (this._skipDeletedFilter) return;

  this.where({ isDeleted: false });
});

module.exports = mongoose.model('FinancialRecord', financialRecordSchema);