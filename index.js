var express = require("express")
var app = express()
var bodyParser = require('body-parser');
var helmet = require('helmet');
var rateLimit = require("express-rate-limit");

var eta = require("eta")
var path = require("path");
var aspclassicplugin = require("./AspClassicPlugin")
var fs = require("fs");
const { raw } = require("express")
var typescript = require('typescript');
var session = require('express-session');
var GlobalEvents = require('./global');
var ExtendedMemoryStore = require('./ExtendedMemoryStore');
var AwaitLock = require('await-lock').default;
var activex = require('./activex')
let lock = new AwaitLock();


// Create some objects to replicate ASP objects
var AppData = {Lock: ()=>lock.acquireAsync(), UnLock : ()=> lock.release()};
var global_events = new GlobalEvents(AppData);

var memoryStore = new ExtendedMemoryStore({timeout: 30 * 60 * 1000});
memoryStore.session_events.on('session_start', function (sid) {
     // do something here
     global_events.session_start();
     console.log('session started ' + sid);
});

memoryStore.session_events.on('session_end', function (sid) {
  // do something here
  global_events.session_end();
  console.log('session end' + sid);
});



var sess = {
  store: memoryStore,
  secret: process.env.EXPRESS_SECRET || 'some secret for asp', 
  key: 'sid', 
  cookie: {secure: false, maxAge: 100},
  maxAge:  100
};
 
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}
 
app.use(session(sess));
/* we need to do this to emulate more closely the
 session creation events 
 */
memoryStore.hookupGenerateSession();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

eta.configure({
  plugins: [aspclassicplugin],
  cache: false
})

app.engine("eta", eta.renderFile)
app.use(express.static('public'));

app.use(bodyParser.urlencoded({extended: false}));
app.use(helmet());
app.use(limiter);


app.set("view engine", "eta")
var viewFolder = path.join(__dirname, 'views');
app.set('views', viewFolder);
//app.set("views", "./views")


function callback(res,data) {
   // var data = data;
   // var res = res;
   // var tsSourceFile = tsSourceFile;
   // var sourceCode = sourceCode;
    return function(err,html) {
        if (err) {
            sourceCode = err.stack;
            var start = sourceCode.indexOf("var rW");
            var end = sourceCode.indexOf("at EtaErr");
            sourceCode = sourceCode.substring(start,end);
            let tsSourceFile = typescript.createSourceFile(
                "dummy",
                sourceCode,
                typescript.ScriptTarget.Latest
              );
            if (tsSourceFile && tsSourceFile.parseDiagnostics) {
                tsSourceFile.parseDiagnostics.forEach(element => {
                    res.send(`Error in script ${element.messageText}]\n${sourceCode.substring(element.start,300)}`);
                });
            }
            else 
            console.err(err);
        }
        if (data.Server.ResponseType) {
            res.set('Content-Type',data.Server.ResponseType);
        }
        if (data.Server.Redirect) {
            res.redirect(data.Server.Redirect);
            return;
        }
        if (data.Server.TransferURL) 
        {
            let requestedView = path.parse(data.Server.TransferURL);
            if (requestedView.name === '') {
                requestedView.name = "default";
            }
            let filePath = path.join(viewFolder, requestedView.dir, requestedView.name) + '.eta';
        
            if (fs.existsSync(filePath)) {
              let viewPath;
              if (requestedView.dir === '/' || requestedView.dir === '') { //view is in the root of the views directory
                viewPath = requestedView.name;
              } else { //need to include the subfolder(s) in the path to the requested view
                //using slice() to remove the leading '/' from the directory path
                viewPath = `${requestedView.dir.slice(1)}/${requestedView.name}`;
              }
              //should now have the correct path to the view, go ahead and render() it
              data.Server.TransferURL = null;
              res.render(viewPath,data,callback( res, data));
              return;
            }
            res.send("Invalid Transfer");
        }
        if (data.Server.Exec) {
          data.Server.Exec = false;
          data.Server.ExecRes = html;
          return;
        }
        res.send(html);
  }
}


app.AppData = AppData;


 //now define the catch-all view render route
 app.use((req, res, next) => {
    let requestedView = path.parse(req.path);
    if (requestedView.name === '') {
        requestedView.name = "default";
    }
    let filePath = path.join(viewFolder, requestedView.dir, requestedView.name) + '.eta';

    if (fs.existsSync(filePath)) {
      let viewPath;
      if (requestedView.dir === '/') { //view is in the root of the views directory
        viewPath = requestedView.name;
      } else { //need to include the subfolder(s) in the path to the requested view
        //using slice() to remove the leading '/' from the directory path
        viewPath = `${requestedView.dir.slice(1)}/${requestedView.name}`;
      }
      //should now have the correct path to the view, go ahead and render() it
      var data = { test:"test",
      AppData: AppData,
      Server: { 
        exports:{},
        ResponseType:"text/html", 
        Session: req.session, 
        CreateObject : activex.CreateObject,
        Iter: (x)=> new activex.newIter(x),
        MapPath: (x)=> path.resolve(x)
      } , 
      Request : { QueryString : (x)=> req.query[x], Form: (x) => req.body[x]}};
      res.render(viewPath,data,callback(res, data));
    } else {
      next(); //important in order to display the 404 handler if the view was not found
    }
  });

  //the 404 route handler should always be last!
  app.use((req, res, next) => {
    res.render('404');
  });


// app.get("/", function (req, res) {
//   res.render("test", {
//     favorite: "Eta",
//     name: "Ben",
//     reasons: ["fast", "lightweight", "simple"]
//   })
// })

app.listen(8000, function () {
  console.log("listening to requests on port 8000")
  global_events.application_start();
});