const mongoose = require('mongoose');

const financialRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },
    type: {
      type: String,
      enum: {
        values: ['income', 'expense'],
        message: 'Type must be income or expense'
      },
      required: [true, 'Type is required']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters']
    },
    date: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    tags: {
      type: [String],
      default: []
    },
    // ── Soft delete support ───────────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// ─── Index for frequent queries ────────────────────────────────────────────────
financialRecordSchema.index({ createdBy: 1, date: -1 });
financialRecordSchema.index({ type: 1, category: 1 });
financialRecordSchema.index({ isDeleted: 1 });

// ─── Default filter: exclude soft-deleted records ─────────────────────────────
financialRecordSchema.pre(/^find/, function (next) {
  if (this._skipDeletedFilter) return next();
  this.where({ isDeleted: false });
  next();
});

module.exports = mongoose.model('FinancialRecord', financialRecordSchema);