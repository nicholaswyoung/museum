var gulp  = require('gulp')
,   mocha = require('gulp-mocha');

gulp.task('test', function () {
  gulp.src('test/*.test.js')
    .pipe(mocha({ timeout: 3000 }))
    .on('error', console.error);
});

gulp.task('default', function () {
  gulp.watch('test/*', ['test']);
});
