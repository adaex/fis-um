#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));
var Liftoff = require('liftoff');
var cli = new Liftoff({
    name: 'fis-um',
    processTitle: 'fis-um',
    moduleName: 'fis-um',
    configName: 'config',
    extensions: {
        '.js': null
    }
});

cli.launch({
    cwd: argv.r || argv.root,
    configPath: argv.f || argv.file
}, function (env) {
    var config = require(env.configPath);
    var fis = $fis(config);
    if (config.isMin) argv.w = false;
    fis.cli.run(argv, env);
});


function $fis(config) {

    var fis = require('fis3');
    fis.require.prefixes.unshift('fis-um');
    fis.cli.name = 'fis-um';

    //一般模式部署规则
    fis.set('project.files', '/*/*/*.html')
        .hook('amd')
        .match('*', {
            deploy: [fis.plugin('skip-packed'), fis.plugin('local-deliver', {to: '../'})],
            release: "/rd/$0"
        })
        //打包路径处理
        .match('/(*)/({_,$})(**)', {
            release: "/rd/$1/$3"
        })
        .match('/(*)/({_,$,})(*)/**.{js,htm,tpl}', {
            packTo: '/$1/asset/$3.js'
        })
        .match('/(*)/({_,$,})(*)/**.{css,less}', {
            packTo: '/$1/asset/$3.css'
        })
        .match('/3rd/**', {
            packTo: false
        })
        //各类型资源处理
        .match('*.{html,js,css,less,htm,tpl}', {
            parser: fis.plugin('replace', {rules: [{search: /\/rs\//g, replace: "/"}]})
        })
        .match('*.html', {
            parser: fis.plugin('extract-inline', config, "append")
        })
        .match('*.js', {
            isMod: true,
            preprocessor: fis.plugin('js-require-css')
        })
        .match('global/*.js', {
            isMod: false,
            parser: fis.plugin('replace', {rules: [{search: '{config.host}', replace: config.host}]})
        })
        .match('*.{htm,tpl}', {
            isHtmlLike: true,
            postprocessor: fis.plugin('tpl2js'),
            rExt: '.js'
        })
        .match('*.less', {
            parser: fis.plugin('less-2.x', null, "append"),
            rExt: '.css'
        })
        .match('::package', {
            postpackager: fis.plugin('loader', {
                resourceType: 'amd', useInlineMap: false
            })
        });

    // APP模式部署规则
    if (config.isApp) {

        fis.set('project.files', '*.{html,xml}')
            .hook('relative')
            .match("*", {
                relative: true,
                deploy: [fis.plugin('skip-packed'), fis.plugin('local-deliver', {to: '../rd'})],
                release: "/$0"
            })
            .match('/(*)/({_,$})(**)', {
                release: "/$1/$3"
            });
    }

    //上线部署模式
    if (config.isMin) {
        fis.set('project.md5Length', 6)
            .set("settings.packager.map", {useTrack: false})
            .match("*", {
                domain: config.cdn,
                useHash: true
            })
            .match('*.{css,less}', {
                optimizer: fis.plugin('clean-css', {keepSpecialComments: 0})
            })
            .match('*.js', {
                optimizer: fis.plugin('uglify-js', {comments: false})
            })
            .match('*.png', {
                optimizer: fis.plugin('png-compressor')
            })
            .match('*.html', {
                useHash: false,
                optimizer: fis.plugin('html-minifier', {
                    collapseWhitespace: false, removeComments: true, minifyCSS: true, minifyJS: true
                })
            });
    }

    return fis;
}