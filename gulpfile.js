// gulp的入口文件

const {src, dest, series, parallel, watch} = require('gulp')

const del = require('del')  // del不是gulp的插件，但是可通过gulp管理他
const browerSync = require('browser-sync')  // browser-sync不是gulp的插件，但是可通过gulp管理他

const loadPlugins = require('gulp-load-plugins') // 自动加载插件

const plugins = loadPlugins() // 使用plugins.xxx 自动加载插件
// const sass = require('gulp-sass') //样式编译
// const babel = require('gulp-babel') //样式编译
// const swig = require('gulp-swig') //模板编译
// const imagemin = require('gulp-imagemin') //模板编译

// const cleanCss = require('gulp-clean-css') // 清除文件
// const rename = require('gulp-rename') //重命名文件

// browser-sync他提供一个create方法去创建一个服务器
const bs = browerSync.create() // 定义一个开发服务器
// 模板数据
const data = {
    menus: [
      {
        name: 'Home',
        icon: 'aperture',
        link: 'index.html'
      },
      {
        name: 'Features',
        link: 'features.html'
      },
      {
        name: 'About',
        link: 'about.html'
      },
      {
        name: 'Contact',
        link: '#',
        children: [
          {
            name: 'Twitter',
            link: 'https://github.com/henji-1122'
          },
          {
            name: 'About',
            link: 'https://github.com/henji-1122'
          },
          {
            name: 'divider'
          },
          {
            name: 'About',
            link: 'https://github.com/henji-1122'
          }
        ]
      }
    ],
    pkg: require('./package.json'),
    date: new Date()
  }

const clean = () => {
    // del返回的是一个promise函数，del完成过后他可以去标记clean任务完成
    // clean任务应该放在build任务的前面，先删除再生成
    return del(['dist','temp'])  
}

const style = () => {
    return src('src/assets/styles/*scss',{'base':'src'})// 读取流,base:基准路径，输出的dist跟src保持同结构
        .pipe(plugins.sass({outputStyle:'expanded'}))// 转换流, outputStyle:'expanded'->转换后的css结束符}换行显示
        .pipe(dest('temp'))// 输出到temp    dest:分发 发布
        .pipe(bs.reload({ stream: true })) // 以流的方式往浏览器推
}

const script = () => {
    return src('src/assets/scripts/*.js',{'base':'src'})
        // preset-env就是最新的一些所有特性的一个整体的打包,会默认将ECMAScript所有的新特性都转换
        .pipe(plugins.babel({presets:['@babel/preset-env']})) // 若不传presets则转换不完全或无效果
        .pipe(dest('temp')) 
        .pipe(bs.reload({ stream: true }))
}

const page = () => {
    return src('src/*html',{'base':'src'})  // 'src/**/*.html'子目录通配方式
        // 可能会因为swig模板引擎缓存的机制导致页面不会变化，此时需要额外将swig选中的cache设置为false
        .pipe(plugins.swig({
            defaults: {cache: false },
            data:data
        }))// data:data
        .pipe(dest('temp'))
        .pipe(bs.reload({ stream: true }))
}

const image = () => {
    return src('src/assets/images/**',{'base':'src'})  
        .pipe(plugins.imagemin())
        .pipe(dest('dist'))
}

const font = () => {
    return src('src/assets/fonts/**',{'base':'src'})  
        .pipe(plugins.imagemin())
        .pipe(dest('dist'))
}

const extra = () => {
    return src('public/**',{'base':'public'})  
        .pipe(dest('dist'))
}
// 创建serve任务
const serve = () => {
    // watch gulp提供的一个api，自动监视指定目录下的文件并执行相应任务
    // src下的文件发现变化后执行相应任务，就会覆盖dist中的文件，此时browser-sync就会监听到dist文件的变化自动同步到浏览器
    watch('src/assets/styles/*.scss', style)
    watch('src/assets/scripts/*.js', script)
    watch('src/*.html', page)
    // 为提高开发阶段构建效率，以下几个任务不让参与开发时的构建，只是在最终发布上线之前做构建即可
    // watch('src/assets/images/**', image)
    // watch('src/assets/fonts/**', font)
    // watch('public/**', extra)

    // 先将图片、字体、其他额外任务监视去掉，放在watch的一个数组中，变化后通过bs.reload来同步到浏览器
    watch([  //路径中的文件发生变化后，通过browser-sync模块提供的一个reload方法去处理会自动更新到浏览器，reload也可理解为一个任务，因为gulp中的任务都是一个函数
        'src/assets/images/**',
        'src/assets/fonts/**',
        'public/**'
    ], bs.reload)

    bs.init({ // 通过init方法初始化服务器相关配置
        notify: false, // 显示browser-sync是否连接上，会影响页面调试样式
        port: 2020, // 默认3000
        open: true, // 默认自动打开浏览器
        // files: 'dist/**', // 被browser-sync启动后监听的路径通配符,此时改变dist下的文件会自动更新至浏览器
        server: {
           // baseDir: 'dist',  // 指定 网站的根目录
           // 为减少开发阶段构建任务开销，启动src的目的就是相对于图片、字体、pubic等直接放在原位置，不让参与开发时的构建，只是在最终发布上线之前做构建即可
           baseDir: ['temp', 'src', 'public'],
           // 开发阶段优先于baseDir的一个配置，当请求发生时 先看在routes有没有相关的配置，如果没有再走baseDir
           routes:{
             '/node_modules': 'node_modules'  //键：请求的前缀，值：指到项目下的对应目录
           } 
        }

    })
}

// 文件引用处理任务
const useref = () => {
    return src('temp/*.html',{'base':'temp'})  
        .pipe(plugins.useref({searchPath: ['temp', '.']}))  // 引用的资源可能在dist中、可能在src下的node_modules中(.当前路径)
        // html js css 文件压缩处理
        .pipe(plugins.if(/\.js$/, plugins.uglify()))
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true
        })))
        .pipe(dest('dist'))
}

const compile = parallel(style,script,page) 

// 上线之前执行的任务
const build = series(
    clean, 
    parallel(
        series(compile,useref), 
        image, 
        font, 
        extra
      )
    )

// 在gulp serve时先要把src下的样式、js等进行编译操作，所以再创建一个develop的顺序执行的任务,此时image、font等任务就放在build任务中
const develop = series(compile, serve)

module.exports = {
    // style,
    // script,
    // page,
    // image,
    // font,
    // extra,
    // clean,
    // serve,
    // useref,
    // compile,
    clean,
    build,
    develop
}