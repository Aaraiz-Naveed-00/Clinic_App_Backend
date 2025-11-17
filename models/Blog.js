import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    trim: true
  }, // mobile uses 'summary' instead of 'excerpt'
  content: {
    type: String,
    required: true
  },
  body: {
    type: String
  }, // alias for content for mobile compatibility
  excerpt: {
    type: String,
    trim: true
  }, // keep for admin compatibility
  imageUrl: {
    type: String,
    default: ""
  },
  authorName: {
    type: String,
    required: true,
    trim: true
  }, // mobile uses 'authorName'
  author: {
    type: String,
    trim: true
  }, // keep for admin compatibility
  authorId: {
    type: String,
    required: true
  },
  category: {
    type: String,
    trim: true,
    default: "General"
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  date: {
    type: Date
  }, // alias for publishedAt for mobile
  readTime: {
    type: Number, // in minutes
    default: 5
  },
  readTimeLabel: {
    type: String,
    default: "5 min read"
  }, // formatted string for mobile
  views: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  }, // alias for views
  likes: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  }, // for home screen top articles
  featuredOrder: {
    type: Number,
    default: 0
  }, // display order for featured articles
  slug: {
    type: String,
    unique: true,
    sparse: true
  }, // SEO friendly URLs
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

blogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Sync mobile and admin field aliases
  if (this.summary && !this.excerpt) {
    this.excerpt = this.summary;
  } else if (this.excerpt && !this.summary) {
    this.summary = this.excerpt;
  }
  
  if (this.content && !this.body) {
    this.body = this.content;
  } else if (this.body && !this.content) {
    this.content = this.body;
  }
  
  if (this.authorName && !this.author) {
    this.author = this.authorName;
  } else if (this.author && !this.authorName) {
    this.authorName = this.author;
  }
  
  // Set publishedAt and date when first published
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = Date.now();
    this.date = this.publishedAt;
  }
  
  // Sync status with isPublished
  if (this.isPublished) {
    this.status = 'published';
  } else {
    this.status = 'draft';
  }
  
  // Sync date with publishedAt
  if (this.publishedAt && !this.date) {
    this.date = this.publishedAt;
  } else if (this.date && !this.publishedAt) {
    this.publishedAt = this.date;
  }
  
  // Calculate read time based on content length
  if (this.content) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(' ').length;
    this.readTime = Math.ceil(wordCount / wordsPerMinute);
    this.readTimeLabel = `${this.readTime} min read`;
  }
  
  // Sync view counts
  if (this.views !== this.viewCount) {
    this.viewCount = this.views;
  }
  
  // Generate slug from title if not provided
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  next();
});

export default mongoose.model("Blog", blogSchema);
