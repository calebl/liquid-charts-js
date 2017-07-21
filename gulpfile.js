var gulp = require('gulp');
var concat = require('gulp-concat');
var minify = require('gulp-minify');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var watch  = require('gulp-watch');

gulp.task('develop', function() {
  watch('./src/*.js', {}, function(e){

    console.log(new Date() + ' -- ' + e.history[0].replace(e.base, ''));
    gulp.src('./src/*.js')
      .pipe(concat('liquid-charts.js'))
      .pipe(gulp.dest('example/public/js'))
  })
});

gulp.task('build', function() {
  return gulp.src('./src/*.js')
    .pipe(concat('liquid-charts.js'))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    .pipe(minify())
    .pipe(rename({
      extname: '.min.js'
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('default',['develop']);
