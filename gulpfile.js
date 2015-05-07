/*jslint indent: 2 */
"use strict";

/*
 * Load modules / packages
 */

var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer');
var changed = require('gulp-changed');
var concat = require('gulp-concat');
var deleted = require('gulp-deleted');
var gulpif = require('gulp-if');
var imagemin = require('gulp-imagemin');
var livereload = require('gulp-livereload');
var notify = require('gulp-notify');
var pixrem = require('gulp-pixrem');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var rev = require('gulp-rev');
var sass = require('gulp-ruby-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var del = require('del');
var notifier = require('node-notifier');
var path = require('path');

/*
 * Settings
 */

var paths = {
  dev: 'dev/',
  build: 'htdocs/',
  index: 'index.+(html|php)',
  site: [
    'dev/**/*',
    'dev/.htaccess',
    '!dev/styles{,/**}',        // specific task!
    '!dev/scripts/*',           // specific task!
    '!dev/scripts/lib{,/**}',   // specific task!
    '!dev/images{,/**}'         // specific task!
  ],
  styles: {
    src: 'styles/',
    main: 'styles/main.scss',
    files: 'styles/**/*.scss',
    dest: 'styles/main.min.css'
  },
  scripts: {
    src: 'scripts/',
    main: 'scripts/main.js',
    files: 'scripts/**/*.js',
    concat: ['dev/scripts/main.js', 'dev/scripts/lib/qux.js'],
    dest: 'scripts/main.min.js'
  },
  images: {
    src: 'images/',
    files: 'images/**/*'
  },
  static: {
    files: '**/*.+(html|php|jade)'
  }
};
var config = {
  env: 'dev'
};


/*
 * Tasks
 */

// DEFAULT task -> DEV
gulp.task('default', ['styles', 'scripts', 'watch'], function () {
  console.log('gulp default');
  notifier.notify({
    title: 'Gulp notification',
    message: 'DEV task COMPLETE!'
  });
});

// stylesheets : sass + sourcemaps + autoprefixer + pixrem + livereload
gulp.task('styles', function () {
  return sass(paths.dev + paths.styles.main, { sourcemap: true, style: 'compressed'})
    .pipe(plumber())
    .pipe(autoprefixer({
      browsers: ['last 2 versions', '> 5%', 'ie >= 8', 'Firefox ESR'],
      cascade: false
    }))
    .pipe(pixrem('18px'))
    .pipe(rename({
      suffix: ".min"
    }))
    // .pipe(sourcemaps.write('./', {
    //   includeContent: false
    // }))
    .pipe(gulpif(
      config.env === 'dev',
      sourcemaps.write('./', {
        includeContent: false
      })
    ))
    // .pipe(gulp.dest(paths.dev + paths.styles.src))
    .pipe(gulpif(
      config.env === 'dev',
      gulp.dest(paths.dev + paths.styles.src),
      gulp.dest(paths.build + paths.styles.src)
    ))
    .pipe(livereload())
    .pipe(notify({
      onLast: true,
      message: 'STYLES task SUCCESS!',
      icon: null
    }));
});

// scripts concat + uglify + sourcemaps
gulp.task('scripts', function () {
  return gulp.src(paths.scripts.concat)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(concat('main.js'))
    .pipe(uglify())
    .pipe(rename({
      suffix: ".min"
    }))
    // .pipe(sourcemaps.write('./', {
    //   includeContent: false
    // }))
    .pipe(gulpif(
      config.env === 'dev',
      sourcemaps.write('./', {
        includeContent: false
      })
    ))
    // .pipe(gulp.dest(paths.dev + paths.scripts.src))
    .pipe(gulpif(
      config.env === 'dev',
      gulp.dest(paths.dev + paths.scripts.src),
      gulp.dest(paths.build + paths.scripts.src)
    ))
    .pipe(livereload())
    .pipe(notify({
      onLast: true,
      message: 'SCRIPTS task SUCCESS!',
      icon: null
    }));
});

// livereload for “static” files (.html, .php, .jade, …)
gulp.task('static', function () {
  livereload.reload();
});

// livereload is listening to you…
gulp.task('watch', function () {
  livereload.listen();
  gulp.watch(paths.dev + paths.styles.files, ['styles']);
  gulp.watch(paths.dev + paths.scripts.files, ['scripts']);
  gulp.watch(paths.dev + paths.static.files, ['static']);
});

// BUILD task
// gulp.task('build', ['init-build', 'copy', 'scripts', 'styles', 'images', 'revision-clean', 'revision-write', 'revision-refs'], function () {
gulp.task('build', ['init-build', 'copy', 'styles', 'scripts', 'images'], function () {
  console.timeEnd('BUILD TIME');
  notifier.notify({
    title: 'Gulp notification',
    message: 'BUILD task COMPLETE!'
  });
});

// set build config
gulp.task('init-build', function () {
  config.env = 'build';
  console.time('BUILD TIME');
});

// copy (all) changed files except styles/scripts/images + .htaccess + remove deleted files
gulp.task('copy', ['init-build'], function () {
  return gulp
    .src(paths.site)
    .pipe(deleted(paths.dev, paths.build, paths.site))
    .pipe(changed(paths.build))
    .pipe(gulp.dest(paths.build))
    .pipe(notify({
      onLast: true,
      message: 'COPY task SUCCESS!',
      icon: null
    }));
});

// images optimisation (only changed)
gulp.task('images', function () {
  return gulp
    .src(paths.dev + paths.images.files)
    .pipe(changed(paths.build))
    .pipe(imagemin())
    .pipe(gulp.dest(paths.build + paths.images.src))
    .pipe(notify({
      onLast: true,
      message: 'IMAGES task SUCCESS!',
      icon: null
    }));
});

// revision control for styles and scripts
gulp.task('rev', function () {
  return gulp
    .src([paths.build + paths.styles.dest, paths.build + paths.scripts.dest], { base: 'htdocs' })
    .pipe(rev())
    .pipe(gulp.dest('htdocs'))
    .pipe(rev.manifest())
    .pipe(gulp.dest('htdocs'));
});

// clean styles and scripts after revision
gulp.task('rev-clean', ['rev'], function (cb) {
  del([paths.build + paths.styles.dest, paths.build + paths.scripts.dest], cb);
});
