import mongoose from 'mongoose';

const SubcategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for category + name uniqueness
SubcategorySchema.index({ categoryId: 1, name: 1 }, { unique: true });

export default mongoose.models.Subcategory || mongoose.model('Subcategory', SubcategorySchema);