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
var revReplace = require('gulp-rev-replace');
var sass = require('gulp-ruby-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var del = require('del');
var fs = require('fs');
var ncp = require('ncp').ncp;
var notifier = require('node-notifier');
var path = require('path');
var revDel = require('rev-del');
var _ = require('underscore');


/* ------------------------------------------------------
 * Settings
 */

var config = {
  env: 'dev' // vs 'build'
};

// src, dest, directories, files, paths, globs, …
var devDir = 'dev/',
  buildDir = 'htdocs/',
  siteFiles = [
    '**/*',
    '.htaccess',
    '!styles{,/**}',        // specific task!
    '!scripts/*',           // specific task!
    '!scripts/lib{,/**}',   // specific task!
    '!images{,/**}',        // specific task!
    '!rev-manifest.json'    // specific task!
  ],
  staticFiles = '**/*.+(html|php|jade)',
  imagesDir = 'images/',
  imagesFiles = 'images/**/*',
  scriptsDir = 'scripts/',
  scriptsFiles = [
    'scripts/*.js',
    'scripts/lib/*.js',
    '!scripts/**/*.min.js'
  ],
  scriptsConcat = [
    'scripts/lib/baz.js',
    'scripts/lib/qux.js'
  ],
  stylesDir = 'styles/',
  stylesFiles = 'styles/**/*.scss',
  mainFile = 'main',
  revFiles = 'index.+(html|php|jade)';


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

  var src = devDir + stylesDir + mainFile + '.scss';

  return sass(src, { sourcemap: true, style: 'compressed' })
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
      gulp.dest(devDir + stylesDir),
      gulp.dest(buildDir + stylesDir)
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

  var src = pathPrefixer(scriptsFiles, devDir);

  return gulp.src(src)
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
    .pipe(gulpif(
      config.env === 'dev',
      gulp.dest(devDir + scriptsDir + 'vendor/'),
      gulp.dest(buildDir + scriptsDir + 'vendor/')
    ))
    .pipe(livereload())
    .pipe(notify({
      onLast: true,
      message: 'MODERNIZR task SUCCESS!',
      icon: null
    }));
});


/*
 * SCRIPTS task
 * scripts: concat + uglify + livereload + sourcemaps (only in dev mode)
 */
gulp.task('scripts', function () {

  var srcMain = scriptsDir + mainFile + '.js',
    srcConcat = scriptsConcat.concat(srcMain),
    src = pathPrefixer(srcConcat, devDir);

  return gulp.src(src)
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
      gulp.dest(devDir + scriptsDir),
      gulp.dest(buildDir + scriptsDir)
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

  var src = devDir + imagesFiles;

  return gulp
    .src(src)
    .pipe(gulpif(
      config.env === 'dev',
      cache('images'),
      changed(buildDir + imagesDir, {hasChanged: changed.compareSha1Digest})
    ))
    .pipe(imagemin())
    .pipe(gulpif(
      config.env === 'dev',
      gulp.dest(devDir + imagesDir),
      gulp.dest(buildDir + imagesDir)
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
  gulp.watch(pathPrefixer(stylesFiles, devDir), ['styles']);
  gulp.watch(pathPrefixer(scriptsFiles, devDir), ['scripts', 'modernizr']);
  gulp.watch(pathPrefixer(imagesFiles, devDir), ['images']);
  gulp.watch(pathPrefixer(staticFiles, devDir), ['static']);
});


/* ------------------------------------------------------
 * BUILD task
 */
// gulp.task('build', ['init-build', 'copy', 'scripts', 'styles', 'images', 'revision-clean', 'revision-write', 'revision-refs'], function () {
gulp.task('build', ['init-build', 'copy', 'modernizr', 'styles', 'scripts', 'images', 'rev', 'rev-replace', 'rev-clean'], function () {
  console.timeEnd('BUILD TIME');
  notifier.notify({
    title: 'Gulp notification',
    message: 'BUILD task COMPLETE!'
  });
});


/*
 * INIT_BUILD task
 * set build config
 */
gulp.task('init-build', function () {
  config.env = 'build';
  console.time('BUILD TIME');
});


/*
 * COPY task
 * copy (all) changed files except styles/scripts/images + .htaccess + remove deleted files
 */
gulp.task('copy', ['init-build'], function () {

  var src = pathPrefixer(siteFiles, devDir);

  return gulp
    .src(src)
    .pipe(deleted(devDir, buildDir, pathPrefixer(siteFiles, devDir)))
    .pipe(changed(buildDir, {hasChanged: changed.compareSha1Digest}))
    .pipe(gulp.dest(buildDir))
    .pipe(notify({
      onLast: true,
      message: 'COPY task SUCCESS!',
      icon: null
    }));
});


/*
 * REV task
 * revision control for main styles and scripts
 */
gulp.task('rev', ['styles', 'scripts'], function () {

  var src = [buildDir + stylesDir + mainFile + '.min.css', buildDir + scriptsDir + mainFile + '.min.js'];

  return gulp
    .src(src, { base: 'htdocs' })
    // .pipe(rename(function (path) {
    //   path.basename = path.basename.replace('.min', '');
    // }))
    .pipe(rev())
    .pipe(gulp.dest(buildDir))
    .pipe(rev.manifest())
    .pipe(revDel({ dest: 'htdocs' }))
    .pipe(gulp.dest(buildDir));
});

/*
 * REV-REPLACE
 * rewrite occurences of main scripts/styles (after revision)
 */
gulp.task('rev-replace', ['rev'], function () {

  var manifest = gulp.src(buildDir + 'rev-manifest.json'),
    src = buildDir + revFiles;

  return gulp.src(src)
    .pipe(revReplace({manifest: manifest}))
    .pipe(gulp.dest(buildDir));
});




// clean styles and scripts after revision
gulp.task('rev-clean', ['rev-replace'], function (cb) {

  var src = [buildDir + stylesDir + mainFile + '.min.css', buildDir + scriptsDir + mainFile + '.min.js'];

  del(src, cb);
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


/*
 * BOWER-JQUERY
 * copy and minify jQuery from 'bower' to 'vendor' folder
 */
gulp.task('bower-jquery', function () {
  return gulp.src(mainBowerFiles({
    filter: /jquery/
  }))
    .pipe(uglify())
    .pipe(rename({
      suffix: ".min"
    }))
    .pipe(gulp.dest(devDir + scriptsDir + 'vendor/'));
});


/*
 * BOWER-SASS
 * copy Sass libs from 'bower' to 'vendor/lib' folder
 */
gulp.task('bower-sass', function () {
  // get all main Sass files from bower packages
  var mainBowerSassFiles = mainBowerFiles({
    filter: /.\.scss/
  }),
    vendorFolder = process.cwd() + '/' + devDir + stylesDir + 'vendor/';

  /*jslint stupid: true*/
  if (!fs.exists(vendorFolder)) {
    fs.mkdirSync(vendorFolder);
  }
  /*jslint stupid: false*/

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
