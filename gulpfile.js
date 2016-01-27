var gulp = require('gulp');
var concat = require('gulp-concat');
var minify = require('gulp-minify');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('scripts', function() {
  return gulp.src('./src/*.js')
    .pipe(concat('liquid-charts.js'))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    // .pipe(minify())
    .pipe(rename({
      extname: '.min.js'
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('default',['scripts']);
