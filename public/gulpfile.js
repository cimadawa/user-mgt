'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var connect = require('gulp-connect');
var target = "";

/**
 * Compile the main.scss and writes to the dist folder.
 */
gulp.task('compileStyles', function () {
    gulp.src('resources/styles/*.css')
        .pipe(gulp.dest('.tmp/styles/'));
    return gulp.src(['resources/styles/*.scss'])
        .pipe($.plumber())
        .pipe($.rubySass({style: 'expanded'}))
        .pipe($.autoprefixer('last 1 version'))
        .pipe($.concat("main.css"))
        .pipe(gulp.dest('.tmp/styles/'))
        .pipe(gulp.dest('dist/static/styles/'));
});

/**
 * Perform JSHint inspection in all the JS file available
 * in 'app/' directories.
 **/
gulp.task('inspectJs', function () {
    return gulp.src(['./**/*.js', '!./bower_components/**/*.js', '!./node_modules/**/*.js'])
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'))
        .pipe($.jshint.reporter(require('jshint-checkstyle-file-reporter')));
});

/**
 * Put all the common HTML templates (Eg: directives,..) into Angular's $templateCache.
 **/
gulp.task('cacheCommonsTemplates', function(){
   return gulp.src('./**/*.html')
       .pipe($.minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe($.ngHtml2js({
            moduleName: 'app',
            prefix: 'commons-scripts/'
        }))
        .pipe(gulp.dest('.tmp/templates'));
});

/**
 * Put all the  app HTML templates into Angular's $templateCache.
 **/
gulp.task('cacheTemplates', function () {
    return gulp.src(['*/*.html','app.tpl.html' ])
        .pipe($.minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe($.ngHtml2js({
            moduleName: 'app',
            prefix: 'scripts/'
        }))
        .pipe(gulp.dest('.tmp/templates'));
});

/**
 * Concatenate all the reference files given in the  index.html page.
 */
gulp.task('compileReferences', ['compileStyles', 'inspectJs', 'cacheTemplates'], function () {
    return gulp.src('index.html')
        .pipe($.inject(gulp.src('.tmp/templates/**/*.js'), {
            read: false,
            starttag: '<!-- inject:partials -->',
            addRootSlash: false,
            addPrefix: '../'
        }))
        .pipe($.useref.assets())
        .pipe($.useref.restore())
        .pipe($.useref())
        .pipe(gulp.dest('dist/templates/'));
});

/**
 * Copies compiled scripts and styles to dist folder, and fixes references in index.html
 */
gulp.task('compileHtml', ['compileReferences'], function () {
    gulp.src('dist/templates/index.html')
        .pipe($.replace('../../.tmp/compiled/', 'static/'))
        .pipe(gulp.dest('dist/'));
    return gulp.src('.tmp/compiled/**')
        .pipe(gulp.dest('dist/static/'));
});

/**
 * Compress the images.
 */
gulp.task('compressImages', function () {
    return gulp.src(['./images/*'])
        .pipe(($.imagemin({
            optimizationLevel: 3,
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest('dist/static/images'));
});

/**
 * Copy required fonts form libraries.
 */
gulp.task('copyFonts', function () {
    return gulp.src(require('main-bower-files')({ base: 'bower_components'}))
        .pipe($.filter('**/*.{eot,svg,ttf,woff,woff2}'))
        .pipe($.flatten())
        .pipe(gulp.dest('dist/static/fonts'));
});

/**
 * Copy required fonts from font-awesome libraries.
 */
gulp.task('copyFontAwesome', function () {
    gulp.src('bower_components/components-font-awesome/fonts/*.{eot,svg,ttf,woff,woff2}')
        .pipe(gulp.dest('dist/static/fonts'));
});

/**
 * Perform the minification of all the concatenated CSS and JS files.
 */
gulp.task('minify', ['compileHtml'], function () {
    gulp.src('dist/static/**/*.js')
        .pipe($.ngmin())
        .pipe($.uglify())
        .pipe(gulp.dest('dist/static/'));
    return gulp.src('dist/static/**/*.css')
        .pipe($.csso())
        .pipe(gulp.dest('dist/static/'));
});

/**
 * Clean the temp folders.
 */
gulp.task('cleanTemp', function () {
    return gulp.src('.tmp', {read: false})
        .pipe($.clean());
});

/**
 * Cleans all the build files.
 */
gulp.task('cleanAll', function () {
    return gulp.src(['.tmp', 'dist', 'reports/*'], {read: false})
        .pipe($.clean());
});

/**
 * Cleans the dist files for a target.
 */
gulp.task('cleanTarget', function () {
    return gulp.src(['.tmp', 'dist/static/'], {read: false})
        .pipe($.clean());
});

/**
 * Starts default build after cleaning the targets dist folder.
 */
gulp.task('cleanAndBuild', ['cleanTarget'], function () {
    gulp.start('build');
});

/**
 * Runs the required default build tasks and cleans the .tmp folder.
 */
gulp.task('build', ['compileHtml', 'compressImages', 'copyFonts', 'copyFontAwesome'], function () {
    gulp.start('cleanTemp');
});

/**
 * Starts dist build after cleaning the targets dist folder.
 */
gulp.task('cleanAndBuildDist', ['cleanTarget'], function () {
    gulp.start('buildDist');
});

/**
 * Runs the required dist build tasks and cleans the .tmp folder.
 */
gulp.task('buildDist', ['minify', 'compressImages', 'copyFonts', 'copyFontAwesome'], function () {
    gulp.start('cleanTemp');
});

/**
 * Clean the required folders.
 */
gulp.task('clean', function () {
        gulp.start('cleanAll');
});

/**
 * Runs the dev build on all the available targets.
 */
gulp.task('all', function () {
    console.log('Building, please wait...');
    var files = require('fs').readdirSync('resources/');
    var command = 'echo && echo Cleaning && gulp clean';
    for (var count = 0; count < files.length; count++) {
        var target = files[count];
        if (target !== 'common' && require('fs').statSync('resources/').isDirectory()) {
            command += ' && echo && echo Building Target: && gulp --target ';
        }
    }
    require('gulp-run')(command).exec();
});

/**
 * The build task for development purposes. This task does not perform the minification and
 * serves static files form 'dist/static' directory.
 */
gulp.task('default', ['connect'], function () {
    target = require('minimist')(process.argv.slice(2)).target;
    gulp.start('cleanAndBuild');
});

/**
 * The build task for production. this task performs the minification and serves static files form Django
 * staticfiles location.
 */
gulp.task('dist', function () {
    target = require('minimist')(process.argv.slice(2)).target;
    gulp.start('cleanAndBuildDist');
});

gulp.task('connect', function() {
    connect.server({
        root: 'dist',
        livereload: true
    });
});