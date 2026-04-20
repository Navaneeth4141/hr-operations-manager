// backend/models/ApplicantProfile.js
const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  type: { type: String, enum: ['school', 'intermediate', 'degree'], default: 'degree' },
  institution: String,
  field: String,
  fromYear: String,
  toYear: String,
  grade: String,
  score: String
}, { _id: false });

const experienceSchema = new mongoose.Schema({
  title: String,
  company: String,
  from: String,
  to: String,
  description: String
}, { _id: false });

const applicantProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: String,
  age: Number,
  dob: Date,
  phone: String,
  address: String,
  linkedin: String,
  github: String,
  summary: String,
  skills: [String],
  education: [educationSchema],
  workExperience: [experienceSchema]
}, { timestamps: true });

module.exports = mongoose.model('ApplicantProfile', applicantProfileSchema);
