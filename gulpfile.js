const gulp = require('gulp')
const $ = require('gulp-load-plugins')();
const cssConfig = require('./config/csscomb.json');
const fs = require('fs');
const beautifierConfigPath = './config/beautifier.json';
const plugins = require('./config/plugins.json');
const csscomb = require('csscomb')(cssConfig);
const sourceDirectory = 'src/';
const buildDirectory = 'build/';
const svgSprite = require('gulp-svg-sprites');
const rename = require('gulp-rename');
const nodeModulesDirectory = 'node_modules/';

const getPluginsPaths = type => {
  const pluginNames = Object.keys(plugins[type]);

  return !pluginNames.length ? [] :
    pluginNames.map(key => nodeModulesDirectory + plugins[type][key]);
}

gulp.task('build-pug', () => {
  return gulp.src(`${sourceDirectory}pug/*.pug`)
    .pipe($.plumber())
    .pipe($.pug({
      pretty: true
    }))
    .pipe(gulp.dest(buildDirectory))
    .pipe($.connect.reload());
});

gulp.task('sprites', () => {
  return gulp.src(sourceDirectory + 'img/svg-to-sprite/**/*.svg')
    .pipe(svgSprite({
      mode: "symbols",
      svgId: "%f"
    }))
    .pipe(rename({
      dirname: ''
    }))
    .pipe(gulp.dest(buildDirectory + 'img/sprites/'));
});

gulp.task('build-vendor-css', () => {
  return gulp.src([
      ...getPluginsPaths('css')
    ])
    .pipe($.plumber())
    .pipe($.concat('vendor.css'))
    .pipe($.cssnano())
    .pipe(gulp.dest(`${buildDirectory}css`));
});

gulp.task('build-css', () => {
  return gulp.src([
      `${sourceDirectory}scss/*.scss`,
      `${sourceDirectory}scss/components/**/*.scss`
    ])
    .pipe($.plumber())
    .pipe($.sass())
    .pipe($.autoprefixer({
      browsers: ['last 3 versions', '> 1%'],
      cascade: false
    }))
    .pipe($.concat('style.css'))
    .pipe($.cssnano())
    .pipe(gulp.dest(`${buildDirectory}css`))
    .pipe($.connect.reload());
});

gulp.task('build-vendor-js', () => {
  return gulp.src(getPluginsPaths('js'))
    .pipe($.plumber())
    .pipe($.concat('vendor.js'))
    .pipe($.uglify())
    .pipe(gulp.dest(`${buildDirectory}js`));
});

gulp.task('build-js', () => {
  return gulp.src(`${sourceDirectory}js/**/*.js`)
    .pipe($.plumber())
    .pipe($.concat('script.js'))
    .pipe($.babel())
    .pipe(gulp.dest(`${buildDirectory}js`))
    .pipe($.connect.reload());
});

gulp.task('copy-img', () => {
  return gulp.src([
      `${sourceDirectory}img/*.{jpg,jpeg,png,svg,gif,ico}`,
      ...getPluginsPaths('img')
    ])
    .pipe(gulp.dest(`${buildDirectory}img`))
    .pipe($.connect.reload());
});

gulp.task('copy-fonts', () => {
  return gulp.src([
      `${sourceDirectory}font/*.{ttf,eot,woff,woff2,svg}`,
      ...getPluginsPaths('font')
    ])
    .pipe(gulp.dest(`${buildDirectory}font`))
    .pipe($.connect.reload());
});

gulp.task('csscomb', async done => {
  await csscomb.processDirectory(`${sourceDirectory}scss`);
  await csscomb.processFile(`${buildDirectory}css/style.css`);
  return done();
});

gulp.task('group-media-queries', () => {
  return gulp.src(`${buildDirectory}css/style.css`)
    .pipe($.groupCssMediaQueries())
    .pipe(gulp.dest(`${buildDirectory}css`));
});

gulp.task('beautify', () => {
  return gulp.src([`${buildDirectory}*.html`])
    .pipe($.jsbeautifier({
      config: beautifierConfigPath,
      mode: 'VERIFY_AND_WRITE'
    }))
    .pipe($.rename(path => {
      path.dirname = path.extname === '.css' ?
        `${path.dirname}/css` :
        path.dirname;
    }))
    .pipe(gulp.dest(buildDirectory));
});

gulp.task('prettify', gulp.series('csscomb', 'group-media-queries', 'beautify'));

gulp.task('clean', () => {
  if (!fs.existsSync(buildDirectory)) {
    return Promise.resolve();
  }

  return gulp.src(buildDirectory, {
      read: false
    })
    .pipe($.rimraf());
});

gulp.task('watch', () => {
  $.connect.server({
    root: buildDirectory,
    livereload: true
  });

  gulp.watch(`${sourceDirectory}pug/**/*.pug`, gulp.parallel('build-pug'));
  gulp.watch(`${sourceDirectory}scss/**/*.scss`, gulp.parallel('build-css'));
  gulp.watch(`${sourceDirectory}js/**/*.js`, gulp.parallel('build-js'));
  gulp.watch(`${sourceDirectory}img/*.*`, gulp.parallel('copy-img'));
  gulp.watch(`${sourceDirectory}font/**`, gulp.parallel('copy-fonts'));
  gulp.watch(`${sourceDirectory}img/sprites/`, gulp.parallel('sprites'));
});

gulp.task('build', gulp.series(
  gulp.parallel('clean'),
  gulp.parallel('build-pug', 'copy-fonts', 'build-vendor-js', 'build-js', 'copy-img'),
  gulp.series('sprites', 'build-vendor-css', 'build-css'),
  gulp.parallel('prettify')
));

gulp.task('default', gulp.parallel('build'));
