const Koa = require('koa')

const router = require('koa-router')()

const fs = require('fs')

const app = new Koa()

// log request URL:
app.use(async (ctx, next) => {
  console.log('响应了')
  await next()
})

// 强缓存
router.get('/max-age-had', (ctx, next) => {
  console.log('max-age-had')
  const fileName = ctx.request.url.replace('/', '')
  const filePatch = `./html/${fileName}.html`
  let data = fs.readFileSync(filePatch, 'utf-8').replace('{{timestamp}}', new Date())
  data = data
  ctx.response.body = data
  ctx.response.set('Content-Type', 'text/html; charset=utf-8')
  ctx.response.set('Cache-Control', 'max-age=31536000')

  const newMTime = fs.statSync(filePatch).mtime.toGMTString()
  ctx.response.set('Last-Modified', newMTime)
})

router.get('/max-age-0', async (ctx, next) => {
  console.log('max-age-0')
  const fileName = ctx.request.url.replace('/', '')
  const filePatch = `./html/${fileName}.html`
  let data = fs.readFileSync(filePatch, 'utf-8')
  data = data.replace('{{timestamp}}', new Date())
  ctx.response.body = data
  ctx.response.set('Content-Type', 'text/html; charset=utf-8')
  ctx.response.set('Cache-Control', 'max-age=0')
})

router.get('/max-age-null', async (ctx, next) => {
  console.log('max-age-null')
  const fileName = ctx.request.url.replace('/', '')
  const filePatch = `./html/${fileName}.html`
  let data = fs.readFileSync(filePatch, 'utf-8')
  data = data.replace('{{timestamp}}', new Date())
  ctx.response.body = data
  ctx.response.set('Content-Type', 'text/html; charset=utf-8')
  // ctx.response.set('Cache-Control', 'max-age=0')
})

router.get('/last-modified', async (ctx, next) => {
  const oldMTime = ctx.request.header['if-modified-since']
  const fileName = ctx.request.url.replace('/', '')
  const filePatch = `./html/${fileName}.html`
  console.log('newTime:', fs.statSync(filePatch).mtime)
  console.log('oldTime:', oldMTime)
  const newMTime = fs.statSync(filePatch).mtime.toGMTString()
  if (+new Date(oldMTime) === +new Date(newMTime)) {
    ctx.response.status = 304
    console.log('未修改，走缓存')
  } else {
    console.log('修改')
    let data = fs.readFileSync(filePatch, 'utf-8')
    data = data.replace('{{timestamp}}', new Date())
  
    ctx.response.body = data
    ctx.response.set('Content-Type', 'text/html; charset=utf-8')
    ctx.response.set('Last-Modified', newMTime)
  }
})

router.get('/e-tag', async (ctx, next) => {
  const fileName = ctx.request.url.replace('/', '')
  const filePatch = `./html/${fileName}.html`
  
  const oldTag = ctx.request.header['if-none-match']
  // fn(fileName, file)
  const newTag = '1'
  if (oldTag === newTag) {
    ctx.response.status = 304
    console.log('未修改，走缓存')
  } else {
    console.log('修改')
    let data = fs.readFileSync(filePatch, 'utf-8')
    data = data.replace('{{timestamp}}', new Date())
  
    ctx.response.body = data
    ctx.response.set('Content-Type', 'text/html; charset=utf-8')
    ctx.response.set('ETag', newTag)
  }
})

app.use(router.routes())

app.listen(3000)
console.log('app started at port 3000...')
