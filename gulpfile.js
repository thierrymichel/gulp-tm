/*jslint indent: 2, nomen: true, regexp: true */
'use strict';


/* ------------------------------------------------------
 * Load modules / packages
 */

var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer');
var cache = require('gulp-cached');
var changed = require('gulp-changed');
var concat = require('gulp-concat');
var deleted = require('gulp-deleted');
var foreach = require('gulp-foreach');
var gulpif = require('gulp-if');
var imagemin = require('gulp-imagemin');
var livereload = require('gulp-livereload');
var mainBowerFiles = require('main-bower-files');
var modernizr = require('gulp-modernizr');
var notify = require('gulp-notify');
var pixrem = require('gulp-pixrem');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var rev = require('gulp-rev');
var sass = require('gulp-ruby-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var del = require('del');
var fs = require('fs');
var ncp = require('ncp').ncp;
var notifier = require('node-notifier');
var path = require('path');
var _ = require('underscore');


/* ------------------------------------------------------
 * Settings
 */

var paths = {
  dev: 'dev/',
  build: 'htdocs/',
  index: 'index.+(html|php)',
  site: [
    '**/*',
    '.htaccess',
    '!styles{,/**}',        // specific task!
    '!scripts/*',           // specific task!
    '!scripts/lib{,/**}',   // specific task!
    '!images{,/**}'         // specific task!
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
    files: [
      'scripts/*.js',
      'scripts/lib/*.js',
      '!scripts/**/*.min.js'
    ],
    concat: ['scripts/main.js', 'scripts/lib/qux.js'],
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


/* ------------------------------------------------------
 * Utils
 */

// Path(s) concatenation: @base (string) + @path (string or array)
function pathPrefixer(path, base) {
  // preserve !negation for excluded files
  var re = /^(.+)(!)(.+)$/;
  if (typeof path === 'string') {
    return (base + path).replace(re, '$2$1$3');
  }
  return _.map(path, function (item) { return (base + item).replace(re, '$2$1$3'); });
}


/* ------------------------------------------------------
 * Tasks
 */

/*
 * DEFAULT task -> DEV
 */
gulp.task('default', ['styles', 'modernizr', 'scripts', 'watch'], function () {
  console.log('gulp default');
  notifier.notify({
    title: 'Gulp notification',
    message: 'DEV task COMPLETE!'
  });
});


/*
 * STYLES task
 * sass + autoprefixer + pixrem + livereload + sourcemaps (only in dev mode)
 */
gulp.task('styles', function () {
  return sass(pathPrefixer(paths.styles.main, paths.dev), { sourcemap: true, style: 'compressed'})
    .pipe(plumber())
    .pipe(autoprefixer({
      browsers: ['last 2 versions', '> 5%', 'ie >= 8', 'Firefox ESR'],
      cascade: false
    }))
    // .pipe(pixrem('18px'))
    .pipe(rename({
      suffix: ".min"
    }))
    .pipe(gulpif(
      config.env === 'dev',
      sourcemaps.write('./')
    ))
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


/*
 * MODERNIZR task
 * auto custom build
 * crawls through source files, gathers up references to Modernizr tests and outputs a lean, mean Modernizr machine…
 */
gulp.task('modernizr', function () {
  return gulp.src(pathPrefixer(paths.scripts.files, paths.dev))
    .pipe(modernizr('custom.modernizr.js', {
      options: [
        'setClasses',
        'addTest',
        'html5printshiv',
        'testProp',
        'fnBind'
      ]
    }))
    .pipe(uglify())
    .pipe(rename({
      suffix: ".min"
    }))
    .pipe(gulp.dest(paths.dev + paths.scripts.src + 'vendor/'));
});


/*
 * SCRIPTS task
 * scripts: concat + uglify + livereload + sourcemaps (only in dev mode)
 */
gulp.task('scripts', function () {
  return gulp.src(pathPrefixer(paths.scripts.concat, paths.dev))
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(concat('main.js'))
    .pipe(uglify())
    .pipe(rename({
      suffix: ".min"
    }))
    .pipe(gulpif(
      config.env === 'dev',
      sourcemaps.write('./')
    ))
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


/*
 * IMAGES task
 * images optimisation
 * dev mode: only changed images (via cache)
 * build mode: only changed images (via SHA comparison)
 */
gulp.task('images', function () {
  return gulp
    .src(pathPrefixer(paths.images.files, paths.dev))
    .pipe(gulpif(
      config.env === 'dev',
      cache('images'),
      changed(paths.build + paths.images.src, {hasChanged: changed.compareSha1Digest})
    ))
    .pipe(imagemin())
    .pipe(gulpif(
      config.env === 'dev',
      gulp.dest(paths.dev + paths.images.src),
      gulp.dest(paths.build + paths.images.src)
    ))
    .pipe(notify({
      onLast: true,
      message: 'IMAGES task SUCCESS!',
      icon: null
    }));
});


/*
 * STATIC task
 * livereload for “static” files (.html, .php, .jade, …)
 */
gulp.task('static', function () {
  livereload.reload();
});


/*
 * WATCH tasks
 * livereload is listening to you…
 */
gulp.task('watch', function () {
  livereload.listen();
  gulp.watch(pathPrefixer(paths.styles.files, paths.dev), ['styles']);
  gulp.watch(pathPrefixer(paths.scripts.files, paths.dev), ['scripts', 'modernizr']);
  gulp.watch(pathPrefixer(paths.images.files, paths.dev), ['images']);
  gulp.watch(pathPrefixer(paths.static.files, paths.dev), ['static']);
});


/* ------------------------------------------------------
 * BUILD task
 */
// gulp.task('build', ['init-build', 'copy', 'scripts', 'styles', 'images', 'revision-clean', 'revision-write', 'revision-refs'], function () {
gulp.task('build', ['init-build', 'modernizr', 'copy', 'styles', 'scripts', 'images'], function () {
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


/*
 * COPY task
 * copy (all) changed files except styles/scripts/images + .htaccess + remove deleted files
 */
gulp.task('copy', ['init-build', 'modernizr'], function () {
  return gulp
    .src(pathPrefixer(paths.site, paths.dev))
    .pipe(deleted(paths.dev, paths.build, pathPrefixer(paths.site, paths.dev)))
    .pipe(changed(paths.build, {hasChanged: changed.compareSha1Digest}))
    .pipe(gulp.dest(paths.build))
    .pipe(notify({
      onLast: true,
      message: 'COPY task SUCCESS!',
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


/* ------------------------------------------------------
 * INIT / YEOMAN / BOWER tasks
 */

/*
 * INIT task
 */
gulp.task('init', ['bower-jquery', 'bower-sass'], function () {
  notifier.notify({
    title: 'Gulp notification',
    message: 'INIT task SUCCESS!'
  });
});

/*
 * BOWER task
 * Main Yeoman task
 */
gulp.task('bower', ['bower-jquery', 'bower-sass'], function () {
  notifier.notify({
    title: 'Gulp notification',
    message: 'BOWER task SUCCESS!'
  });
});

gulp.task('bower-jquery', function () {
  return gulp.src(mainBowerFiles({
    filter: /jquery/
  }))
    .pipe(uglify())
    .pipe(rename({
      suffix: ".min"
    }))
    .pipe(gulp.dest(paths.dev + paths.scripts.src + 'vendor/'));
});

gulp.task('bower-sass', function () {
  // get all main Sass files from bower packages
  var mainBowerSassFiles = mainBowerFiles({
    filter: /.\.scss/
  }),
    vendorFolder = process.cwd() + '/' + paths.dev + paths.styles.src + 'vendor/';

  if (!fs.exists(vendorFolder)) {
    fs.mkdirSync(vendorFolder);
  }
  _.each(mainBowerSassFiles, function (file) {
    // copy
    // from: bower_components/**/srcFolder/_[filename].scss
    // to: dev/styles/vendor/[filename]/…
    var srcFolder = path.dirname(file),
      nameFolder = path.basename(file, '.scss').substr(1),
      destFolder = vendorFolder + nameFolder;

    // folder creation
    fs.mkdir(destFolder, function () {
      // copy files
      ncp(srcFolder, destFolder, function (err) {
        if (err) {
          return console.error(err);
        }
        console.log(nameFolder + ' done!');
      });
    });
  });
});
