const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters'],
    minlength: [3, 'Project name must be at least 3 characters long']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Project description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'completed', 'archived', 'on-hold'],
      message: 'Status must be one of: active, completed, archived, on-hold'
    },
    default: 'active'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Priority must be one of: low, medium, high, urgent'
    },
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project creator is required']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  budget: {
    amount: {
      type: Number,
      min: [0, 'Budget amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
projectSchema.index({ createdBy: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 });

// Compound indexes
projectSchema.index({ createdBy: 1, status: 1 });
projectSchema.index({ 'members.user': 1, status: 1 });

// Virtual for member count
projectSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (!this.endDate) return null;
  
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
});

// Instance method to check if user is a member
projectSchema.methods.isMember = function(userId) {
  return this.members.some(member => {
    // Handle cases where member.user might be undefined
    if (!member || !member.user) return false;
    
    // Handle both populated and non-populated cases
    const memberUserId = member.user._id ? member.user._id.toString() : member.user.toString();
    return memberUserId === userId.toString();
  });
};

// Instance method to get user's role in project
projectSchema.methods.getUserRole = function(userId) {
  const member = this.members.find(member => {
    // Handle cases where member.user might be undefined
    if (!member || !member.user) return false;
    
    // Handle both populated and non-populated cases
    const memberUserId = member.user._id ? member.user._id.toString() : member.user.toString();
    return memberUserId === userId.toString();
  });
  return member ? member.role : null;
};

// Instance method to add member
projectSchema.methods.addMember = function(userId, role = 'member') {
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this project');
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Instance method to remove member
projectSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => {
    // Handle cases where member.user might be undefined
    if (!member || !member.user) return false; // Remove corrupted entries
    
    // Handle both populated and non-populated cases
    const memberUserId = member.user._id ? member.user._id.toString() : member.user.toString();
    return memberUserId !== userId.toString();
  });
  
  return this.save();
};

// Instance method to update member role
projectSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(member => {
    // Handle cases where member.user might be undefined
    if (!member || !member.user) return false;
    
    // Handle both populated and non-populated cases
    const memberUserId = member.user._id ? member.user._id.toString() : member.user.toString();
    return memberUserId === userId.toString();
  });
  
  if (!member) {
    throw new Error('User is not a member of this project');
  }
  
  member.role = newRole;
  return this.save();
};

// Static method to find projects by user
projectSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    $or: [
      { createdBy: userId },
      { 'members.user': userId }
    ]
  };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.isArchived !== undefined) {
    query.isArchived = options.isArchived;
  }
  
  return this.find(query)
    .populate('createdBy', 'firstName lastName email')
    .populate('members.user', 'firstName lastName email')
    .sort(options.sort || { createdAt: -1 });
};

// Static method to find projects created by user
projectSchema.statics.findByCreator = function(userId, options = {}) {
  const query = { createdBy: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.isArchived !== undefined) {
    query.isArchived = options.isArchived;
  }
  
  return this.find(query)
    .populate('createdBy', 'firstName lastName email')
    .populate('members.user', 'firstName lastName email')
    .sort(options.sort || { createdAt: -1 });
};

// Pre-save middleware
projectSchema.pre('save', function(next) {
  // Ensure creator is always in members list as owner
  if (this.isNew) {
    const creatorAsMember = this.members.find(member => 
      member.user.toString() === this.createdBy.toString()
    );
    
    if (!creatorAsMember) {
      this.members.unshift({
        user: this.createdBy,
        role: 'owner',
        joinedAt: new Date()
      });
    }
  }
  
  next();
});

module.exports = mongoose.model('Project', projectSchema);