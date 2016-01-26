var gulp = require('gulp');
var concat = require('gulp-concat');

gulp.task('scripts', function() {
  return gulp.src('./src/*.js')
    .pipe(concat('liquid-charting.js'))
    .pipe(gulp.dest('./example/public/js/'));
});

gulp.task('default',['scripts']);
