# @vue/cli create

最近通过cli插件搭建项目模版时，遇到了一个初始化readme.md文件模版的问题。在插件的 Generator 中写的readme模版最后都会被 cli自带的默认readme给覆盖掉。带着这个疑惑 克隆了 vue-cli，并且点开了 vue-cli的 create 方法。

## vue create

在我们安装了 `npm install -g @vue/cli` 后，就在注册一个全局的 vue 命令，这个命令写在 `vue-cli/packages/@vue/cli/bin/vue.js` 这个文件中。在我们全局执行 `vue create xxx` 时，其实就是通过node 运行了 vue.js 文件，并且执行了 create方法。让我们看看 create 命令的逻辑：

> 我们可以对 vue create 这种全局方法这样进行调试：把 `vue create xxx` 命令替换成`node path/vue.js create xxx`，这个 `path` 取决于 node 运行的路径和克隆后的 vue.js 文件的相对路径（让node运行vue.js）。

```js
const program = require('commander')
// 省略了一些方法
program
  .command('create <app-name>')
  .description('create a new project powered by vue-cli-service')
  .option('-p, --preset <presetName>', 'Skip prompts and use saved or remote preset')
  // ....
  .option('-f, --force', 'Overwrite target directory if it exists')
  // ...
  .action((name, cmd) => {
    const options = cleanArgs(cmd)
    // ...
    require('../lib/create')(name, options)
  })
```

> 注意，create这里用到了 [commander](https://github.com/tj/commander.js/blob/HEAD/Readme_zh-CN.md)，这是node.js 命令行接口的完整解决方案。

可以看到， vue create 命令其实有[很多选项](https://cli.vuejs.org/zh/guide/creating-a-project.html#vue-create)可以选择，比如我们可以使用 `vue create -f my-project`，初始化一个项目，如果文件夹中已经存在该目录，会强制覆盖。

> 假定我们使用 vue create my-project 去创建项目

我们不需要关心 `commander` 的逻辑，只需要知道最后 create 命令执行的是 ../lib/create 这个文件导出 create 的方法，并且传递给这个方法的 参数分别是 `my-project` 和 `{ git: true }`。简单对这两个参数做一下解释，commander 中的 action，接受的两个参数分别是 'my-project' 和上面 create 命令中的选项结果集合，然后由 cleanArgs 这个方法，把有默认的一些选项整理出来最后变成了 { git: true } 这个对象

让我们接着走下去，看看 create 方法核心做了些什么

## Create && create

```js
 function create (projectName, options) {
  // ....
  const cwd = options.cwd || process.cwd()
  const inCurrent = projectName === '.'
  const name = inCurrent ? path.relative('../', cwd) : projectName
  const targetDir = path.resolve(cwd, projectName || '.')

  // 省略判读目录的逻辑
  const creator = new Creator(name, targetDir, getPromptModules())
  await creator.create(options)
}
```

可以看到得到了初始化的目录后，会实例化一个构造器，然后调用这个构造器的 create 方法去创建实例。实例化时，getPromptModules 方法运行后得到的是一个数组，包含了与插件对话的一些选项（此时还没有进行对话）。下面来看看实例化`Creator`时，发生了什么

```js
module.exports = class Creator extends EventEmitter {
  // name是'my-project'，context是安装路径，prompModules是对话项的数组
  constructor (name, context, promptModules) {
    super()

    this.name = name
    this.context = process.env.VUE_CLI_CONTEXT = context
    const { presetPrompt, featurePrompt } = this.resolveIntroPrompts()
    this.presetPrompt = presetPrompt
    this.featurePrompt = featurePrompt
    this.outroPrompts = this.resolveOutroPrompts()
    this.injectedPrompts = []
    this.promptCompleteCbs = []
    this.afterInvokeCbs = []
    this.afterAnyInvokeCbs = []

    this.run = this.run.bind(this)

    const promptAPI = new PromptModuleAPI(this)
    promptModules.forEach(m => m(promptAPI))
  }
}
```

实例化的时在 creator 对象上挂载一些的属性是用来保存内置的一些对话加载项，及插件的回调，同时也把我们传递的目录保存在全局变量 VUE_CLI_CONTEXT 上。实例化之后调用最核心的 create 方法，初始化项目。

> create 方法超级长，下面代码阉割了无数....

```js
async create (cliOptions = {}, preset = null) {

  // 用于得到 preset 对象，该对象包括了需要安装的一些插件等。
  // 判断 vue create 是否有 --preset选项并输入正确的值进行初始化
  if (!preset) {
    if (cliOptions.preset) {
      preset = await this.resolvePreset(cliOptions.preset, cliOptions.clone)
    } else if (cliOptions.inlinePreset) {
      // 还有各种else if，
    } else {
      preset = await this.promptAndResolvePreset()
    }
  }
  // 得到包管理器，用于安装依赖
  const pm = new PackageManager({ context, forcePackageManager: packageManager })
  // 省略其他属性，定义一个用于生成package.json的对象
  const pkg = {
    name,
    ...
  }

  // 收集 preset 中 plugins中的需要安装的插件，并写入 pkg 对象
  Object.keys(preset.plugins).forEach(dep => {
    // ...
    pkg.devDependencies[dep] = (
      preset.plugins[dep].version || ((/^@vue/.test(dep)) ? `^${latestMinor}` : `latest`)
    )
  })

  // 根据 pkg 对象生成package.json
  await writeFileTree(context, {
    'package.json': JSON.stringify(pkg, null, 2)
  })
  await pm.install()

  // run generator，用于生成默认文件部分
  const plugins = await this.resolvePlugins(preset.plugins)
  const generator = new Generator(context, {
    pkg,
    plugins,
    afterInvokeCbs,
    afterAnyInvokeCbs
  })
  await generator.generate({
    extractConfigFiles: preset.useConfigFiles
  })
  // 注意，generator.generate 运行完后，默认的readme.md 文件已经生成
  
  // 运行generator.generate时，会像package.json注入一些新的东西，保险起见重新安装一边依赖
  await pm.install()

  // 获取模版，强制覆盖，重写README.md
  await writeFileTree(context, {
    'README.md': generateReadme(generator.pkg, packageManager)
  })
  // ...
}
```

我们可以发现 create 命令其实做了这些事情：首先是生成一个包含了需要使用的插件对象，使用默认的方式生成或使用自己定义过的方式。然后安装这些插件，之后便是生成一个 package.json，之后根据这个json。再安装各种各样的npm包。安装好后，便调用 generator 调用插件。因为初始完成后，package.json 会多一些新命令及新依赖，所以需要调用 install 重新安装。安装完成后，便开始生成 README.md 文件。

> 这里的 generator 用于 @vue/cli 调用插件用来初始化插件对应的文件，其不仅只存在 vue create 命令，还存在于 vue invoke 安装插件命令。generator 的相关知识属于开发一个 @vue/cli 的插件的部分，这里不做拓展。关于generator的运行机制可以看[这篇文章](https://juejin.im/post/5b8f586c5188255c9d55eedf#heading-0)。

## writeFileTree

上面生成 README 文件时，会强制覆盖已有的，这导致在 generator 调用插件来生成的 README 文件被覆盖了。这就是最开始说到的 README.md 被覆盖的原因，那带着好奇，来看看 writeFileTree 这个方法，以找出可以 README.md 不被默认覆盖的方法。

```js
module.exports = async function writeFileTree (dir, files, previousFiles) {
  if (process.env.VUE_CLI_SKIP_WRITE) {
    return
  }
  if (previousFiles) {
    await deleteRemovedFiles(dir, files, previousFiles)
  }
  Object.keys(files).forEach((name) => {
    const filePath = path.join(dir, name)
    fs.ensureDirSync(path.dirname(filePath))
    fs.writeFileSync(filePath, files[name])
  })
}
```

当我看见这个方法里有一个全局变量来控制这个函数是否往下执行，喜出望外。只要在 generator 执行完毕后，把这个变量改成`true`并且不影响其他读写文件的操作的话，就可以让我们在 generator 生成的 README 模版保留下来。找到 generator 提供的[回调函数](https://cli.vuejs.org/dev-guide/generator-api.html#oncreatecomplete)，在里面改写该环境变量就可以了。

> 在 generator 的入口文件添加回调，该回调会添加在 create  `afterInvokeCbs` 属性中

```js
module.exports = (api, options) => {
  ......
  api.onCreateComplete(() => {
    process.env.VUE_CLI_SKIP_WRITE = true
  })
}
```

## generotor 回调之后

剩下的就是要保证该回调运行后，会不会影响到写在 generator 下方文件的读写，先看看 create 方法在 执行完 generator 回调后会做些什么：

```js
// 执行 generator 的回调
for (const cb of afterInvokeCbs) { await cb() }
......
// 生成 readme模版，此时因改写了 process.env.VUE_CLI_SKIP_WRITE，writeFileTree 函数跳过
await writeFileTree(context, {
  'README.md': generateReadme(generator.pkg, packageManager)
})

// 生成 pnpm 的.npmrc文件，此时因改写了 process.env.VUE_CLI_SKIP_WRITE，writeFileTree 函数跳过
if (packageManager === 'pnpm') {
  await writeFileTree(context, {
    '.npmrc': pnpmConfig
  })
}

// git 本地提交初始化内容
if (shouldInitGit) {
  await run('git add -A')
  await run('git', ['commit', '-m', 'init'])
}
......
```

遗憾的是如果我们使用 pnpm 版本管理器来进行项目管理，那么就不能生成默认的 .npmrc。不过好消息就是，我们可以在 generator 初始化模版时，自己手动添加默认的 .npmrc来进行规避。所以综合利弊，在现在的 @vue/cli 的 generator 完成回调中把 `VUE_CLI_SKIP_WRITE` 环境变量改成 `false` 能很好的完成我们生成默认文件的需求。

## 总结

以上便是我们运行 `vue create xxx` 命令本身只生成了 package.json 和 readme 文件。其他的对应
的大致内容，该命令负责初步整理初始化体系需要的各种选项，然后根据这些选项生成默认的 package.json 下载对应的依赖，同时执行初始化选项时添加的插件和默认自带的插件部分。每个插件按照 Vue 约定的规定去做相关的事情。执行完毕后，因插件会写入一些项目依赖，所以再次下载这些依赖后，进行初始化插件的各种回调。最后收尾生成 readme 文件及使用 git 保存项目，及一些错误判断。
