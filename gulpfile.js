'use strict';

// Import core build.
let build = require('gulp-core-build');

let typescript = require('gulp-core-build-typescript').typescript;
let webpack = require('gulp-core-build-webpack').default;
let serve = require('gulp-core-build-serve').default;

// Define gulp tasks.
let buildTasks = build.task('build', build.parallel(typescript));
let bundleTasks = build.task('bundle', build.serial(buildTasks, webpack));
let serveTasks = build.task('serve', build.serial(bundleTasks, serve));
let defaultTasks = build.task('default', buildTasks);

// Tell the build to set up gulp tasks with the given gulp instance.
build.initialize(require('gulp'));