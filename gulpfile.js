const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');

// Compile Sass, autoprefix, and minify CSS
function styles() {
  return gulp.src('assets/scss/main.scss')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({ cascade: false }))
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('assets/css'));
}

// Watch for changes in Sass files
function watchFiles() {
  gulp.watch('assets/scss/**/*.scss', styles);
}

exports.styles = styles;
exports.watch = watchFiles;
exports.default = gulp.series(styles, watchFiles);
