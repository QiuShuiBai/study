const Koa = require('koa');

const router = require('koa-router')();

const range = require('koa-range')

const fs = require("fs");

const app = new Koa();

app.use(range)

// log request URL:
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Headers', 'Range');

  if (ctx.method == 'OPTIONS') {
    ctx.body = 200; 
  } else {
    await next();
  }
});

router.get('/heiheihei', async (ctx, next) => {
  let data = await new Promise((resolve) => {
    fs.readFile("./heiheihei.pdf", function (error, data) {
      resolve(data)
    })
  })
  ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  ctx.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range');
  ctx.response.set("Content-Type", "application/pdf")
  ctx.response.set("Accept-Ranges", "bytes")
  ctx.response.body = data
});


router.get('/hahaha', async (ctx, next) => {
  let data = await new Promise((resolve) => {
    fs.readFile("./heiheihei.pdf", function (error, data) {
      resolve(data)
    })
  })
  ctx.response.set("Content-Type", "application/pdf")
  ctx.response.body = data
});

// add router middleware:
app.use(router.routes());

app.listen(3000);
console.log('app started at port 3000...');
