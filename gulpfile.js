// noinspection DuplicatedCode

let fs = require('fs-extra');
let app = JSON.parse(fs.readFileSync('./package.json'));

const gulp = require('gulp'),
    sass = require('gulp-sass'),
    browserSync = require('browser-sync'),
    connect = require('gulp-connect-php'),
    del = require('del'),
    zip = require('gulp-zip'),
    imagemin = require('gulp-imagemin'),
    named = require('vinyl-named'),
    pipeErrorStop = require('pipe-error-stop'),
    webpack = require('webpack-stream'),
    injectPartials = require('gulp-inject-partials'),
    uglify = require('gulp-uglify'),
    friendlyErrors = require('friendly-errors-webpack-plugin'),
    minifyInline = require('gulp-minify-inline'),
    uglifyCss = require('gulp-uglifycss'),
    cleanCss = require('gulp-clean-css'),
    htmlClean = require('gulp-htmlclean');

let webpackConfig = {
    plugins: [
        new friendlyErrors()
    ]
}

/*Set Css and Js name*/
let scssName = 'myapp.scss';
let cssName  = "myapp.css";
let jsName   = "myapp.js";

/*Constant Paths*/
let basePath = {
    root: './',
    src: './src/',
    dist: './dist/',
    dev: './dev/',
    assets: './assets/'
}


/*Extra Paths for additional actions*/
let extraPaths = {
    zipSrc: basePath.dist + "/",
    zipDest: basePath.root + app.slug + "/",
    zipName: app.name + '-' + app.version + '.zip'
}

/*Project Paths*/
let paths = {
    src: {
        html: basePath.src + '**/*.html',
        php: basePath.src + '**/*.php',
    },
    dev: {
        html: basePath.dev + '**/*.html',
        php: basePath.dev + '**/*.php',
    },
    js: {
        src: basePath.src + 'js/',
        dest: basePath.assets + 'js/',
    },
    style: {
        src: basePath.src + 'scss/',
        css: basePath.assets + 'css/'
    },
    img: {
        src: basePath.src + 'img/',
        dest: basePath.assets + 'img/'
    },
    fonts: {
        src: basePath.src + 'fonts/',
        dest: basePath.assets + 'fonts/'
    }
}

/*Sass Optional Options*/
let sassOptions = {
    errLogToConsole: true,
    outputStyle: 'expanded',
    //precision: 3
}

/*Grab all html and php files in src and place it in dev directory*/
gulp.task("views", (done)=>{
    gulp.src(paths.src.html,{ allowEmpty: true })
        .pipe(injectPartials())
        .pipe(gulp.dest(basePath.dev));
    gulp.src(paths.src.php, { allowEmpty: true })
        .pipe(injectPartials())
        .pipe(gulp.dest(basePath.dev));
    done();
});

gulp.task("views-watch", gulp.series("views", ()=>{
    return browserSync.reload();
}));


/* Compile Sass Files*/
gulp.task("sass", (done)=>{
    gulp.src(paths.style.src + scssName,{ sourcemaps: true })
        .pipe(named())
        .pipe(sass(sassOptions).on('error', sass.logError))
        .pipe(gulp.dest(paths.style.css, { sourcemaps: "./maps" }));
    done();
});

/*Grab and perform Script Compilation*/
gulp.task("script", (done)=>{
    gulp.src(paths.js.src + jsName,{ sourcemaps: true })
        .pipe(named())
        .pipe(webpack({
            config: webpackConfig
        })).on("error", (err)=>{
            console.log("-----Sorry Error Occurred-----");
        })
        .pipe(pipeErrorStop())
        .pipe(gulp.dest(paths.js.dest, { sourcemaps: "./maps" }));
    done();
});

/*Image Compress*/
gulp.task("image-min", (done)=>{
    gulp.src(paths.img.src + "**/*" , { allowEmpty: true })
        .pipe(imagemin({
            silent: true
        }))
        .pipe(gulp.dest(paths.img.dest));
    done();
});

/*Fonts Copy*/
gulp.task("copy-fonts", (done)=>{
    gulp.src(paths.fonts.src + "**/*", { allowEmpty: true })
        .pipe(gulp.dest(paths.fonts.dest));
    done();
});

/*Copy Vendor if any*/
gulp.task("copy-vendor", (done)=>{
    gulp.src(basePath.src + 'vendor/**/*', { allowEmpty: true })
        .pipe(gulp.dest(basePath.dev + 'vendor/'));
    done();
});

/*Copy Assets*/
gulp.task("copy-assets", (done)=>{
    gulp.src(basePath.src + 'assets/**/*', { allowEmpty: true })
        .pipe(gulp.dest(basePath.dev + 'assets/'));
    done();
});

/*Clean Dev*/
gulp.task("clean-dev", (done)=>{
    del.sync(basePath.dev + '*/');
    done();
});

/*Default*/
gulp.task("default",gulp.series(
    "views",
    "sass",
    "script",
    "image-min",
    "copy-fonts",
    "copy-vendor",
    "copy-assets"
));

/*Build Dev Version*/
gulp.task("build-dev", gulp.series(
    "clean-dev",
    "default",
));


/**Build Dist Version*/

/*Dist Views*/
gulp.task("dist:views", gulp.series("views", (done) =>{
    gulp.src(paths.dev.html, { allowEmpty: true })
        .pipe(gulp.dest(basePath.dist));
    gulp.src(paths.dev.php, { allowEmpty: true })
        .pipe(gulp.dest(basePath.dist));
    done();
}));

/*Dist Copy vendor*/
gulp.task("dist:copy-vendor", gulp.series("copy-vendor", (done)=>{
    gulp.src(basePath.dev + 'vendor/**/*', { allowEmpty: true })
        .pipe(gulp.dest(basePath.dist + 'vendor/'));
    done();
}));

/*Dist Copy assets*/
gulp.task("dist:copy-assets", gulp.series("copy-assets", (done)=>{
    gulp.src(basePath.dev + 'assets/**/*', { allowEmpty: true })
        .pipe(gulp.dest(basePath.dist + 'assets/'));
    done();
}));

/*Clean Dist Directory*/
gulp.task("dist:clean", (done)=>{
    del.deleteSync(basePath.dist + '**', { force: true });
    done();
});

/*Dist Build*/
gulp.task("dist:build", gulp.series(
    "dist:clean",
    "default",
    "dist:views",
    "dist:copy-vendor",
    "dist:copy-assets"
));

/*Gulp Watch Tasks*/

/*Gulp watch for Html*/
gulp.task("watch", gulp.series("build-dev", (done) => {
    browserSync.init({
        server: {
            baseDir: basePath.dev
        }
    });
    gulp.watch(paths.js + '**/*', gulp.series("script", function(done){
      gulp.src(basePath.assets + 'js/' + jsName)
          .pipe(gulp.dest(basePath.dev + 'assets/js/'))
          .pipe(browserSync.reload({ stream: true }));
        done();
    }));
    gulp.watch(paths.style.src + '**/*', gulp.series("sass", function(done){
        gulp.src(basePath.assets + 'css/' + cssName)
            .pipe(gulp.dest(basePath.dev + 'assets/css/'))
            .pipe(browserSync.reload({ stream: true }));
        done();
    }));
    gulp.watch(paths.img.src, gulp.series("image-min", function (done) {
       gulp.src(basePath.assets + 'img/**/*', { allowEmpty: true })
           .pipe(gulp.dest(basePath.dev + "/assets/img/"))
           .pipe(browserSync.reload({ stream: true }));
         done();
    }));
    gulp.watch(paths.fonts.src + '**/*', gulp.series("copy-fonts", function (done) {
        gulp.src(basePath.assets + 'fonts/**/*', { allowEmpty: true })
            .pipe(gulp.dest(basePath.dev + "/assets/fonts/"))
            .pipe(browserSync.reload({ stream: true }));
        done();
    }));

    /*Place File in Dev Folder on Src Change Detection*/
    gulp.watch(basePath.src + "*.html").on("change", function(file){
       let fileName = file.path.split("/").pop();
         return gulp.src(basePath.src + fileName)
            .pipe(injectPartials({
                 removeTags: true,
                 ignoreError: true
             }))
            .pipe(gulp.dest(basePath.dev))
            .pipe(browserSync.reload({ stream: true }));

    });

    gulp.watch(basePath.src + "**/*.html").on("change", function(file){
        let fileName = file.path.split("/").pop();
        return gulp.src(basePath.src + fileName)
            .pipe(injectPartials({
                removeTags: true,
                ignoreError: true
            }))
            .pipe(gulp.dest(basePath.dev))
            .pipe(browserSync.reload({ stream: true }));

    });

}));

/*Gulp Watch for PHP*/
gulp.task("watch:php", gulp.series("build-dev", (done) => {
    connect.server({
        base: basePath.dev,
        port: 3002,
        livereload: true,
        open: false,
        stdio: "ignore",
        keepalive: true
    }, function(){
        browserSync({
            baseDir: basePath.dev,
            proxy: "localhost:3002",
            open: true,
            notify: true,
            logPrefix: "Cypherios"
        })
    });
    gulp.watch(paths.js + '**/*', gulp.series("script", function(done){
        gulp.src(basePath.assets + 'js/' + jsName)
            .pipe(gulp.dest(basePath.dev + 'assets/js/'))
            .pipe(browserSync.reload({ stream: true }));
        done();
    }));
    gulp.watch(paths.style.src + '**/*', gulp.series("sass", function(done){
        gulp.src(basePath.assets + 'css/' + cssName)
            .pipe(gulp.dest(basePath.dev + 'assets/css/'))
            .pipe(browserSync.reload({ stream: true }));
        done();
    }));
    gulp.watch(paths.img.src, gulp.series("image-min", function (done) {
        gulp.src(basePath.assets + 'img/**/*', { allowEmpty: true })
            .pipe(gulp.dest(basePath.dev + "/assets/img/"))
            .pipe(browserSync.reload({ stream: true }));
        done();
    }));
    gulp.watch(paths.fonts.src + '**/*', gulp.series("copy-fonts", function (done) {
        gulp.src(basePath.assets + 'fonts/**/*', { allowEmpty: true })
            .pipe(gulp.dest(basePath.dev + "/assets/fonts/"))
            .pipe(browserSync.reload({ stream: true }));
        done();
    }));

    /*Place File in Dev Folder on Src Change Detection*/
    gulp.watch(basePath.src + "*.html").on("change", function(file){
        let fileName = file.path.split("/").pop();
        return gulp.src(basePath.src + fileName)
            .pipe(injectPartials({
                removeTags: true,
                ignoreError: true
            }))
            .pipe(gulp.dest(basePath.dev))
            .pipe(browserSync.reload({ stream: true }));

    });

    gulp.watch(basePath.src + "**/*.html").on("change", function(file){
        let fileName = file.path.split("/").pop();
        return gulp.src(basePath.src + fileName)
            .pipe(injectPartials({
                removeTags: true,
                ignoreError: true
            }))
            .pipe(gulp.dest(basePath.dev))
            .pipe(browserSync.reload({ stream: true }));

    });

    gulp.watch(basePath.src + "*.php").on("change", function(file){
        let fileName = file.path.split("/").pop();
        return gulp.src(basePath.src + fileName)
            .pipe(injectPartials({
                removeTags: true,
                ignoreError: true
            }))
            .pipe(gulp.dest(basePath.dev))
            .pipe(browserSync.reload({ stream: true }));

    });

    gulp.watch(basePath.src + "**/*.php").on("change", function(file){
        let fileName = file.path.split("/").pop();
        return gulp.src(basePath.src + fileName)
            .pipe(injectPartials({
                removeTags: true,
                ignoreError: true
            }))
            .pipe(gulp.dest(basePath.dev))
            .pipe(browserSync.reload({ stream: true }));

    });

}));

/*Zip Dist*/
gulp.task("clean:zipPath", function(){
   return del.sync(extraPaths.zipDest + "*/");
});
gulp.task("zip-project", gulp.series("dist:build", "clean:zipPath", function(done){
    gulp.src(extraPaths.zipSrc + "**")
        .pipe(zip(extraPaths.zipName))
        .pipe(gulp.dest(extraPaths.zipDest));
    done();
}));

