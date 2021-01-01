const Koa = require('koa');

const router = require('koa-router')();

const bodyParser = require('koa-bodyparser')

const app = new Koa();

app.use(bodyParser())

app.use(async (ctx, next) => {
  // ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS')
  ctx.set("Access-Control-Allow-Headers", " Origin, X-Requested-With, Content-Type, Accept, X-Test");
  if (ctx.method == 'OPTIONS') {
    ctx.body = 200; 
  } else {
    await next();
  }
});

router.get('/test', async (ctx, next) => {
  const callbackName = ctx.request.query.callback
  const result = {
    errno: 0,
    errmsg: 'success',
    data: {
      name: 'zc'      
    }
  }
  const jsonpStr = `${callbackName}(${JSON.stringify(result)})`

  ctx.response.body = callbackName ? jsonpStr : result
});

// add router middleware:
app.use(router.routes())

app.listen(3000);
console.log('app started at port 3000...');
