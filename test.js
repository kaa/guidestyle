var t = require("./dist/index.js")
  util = require("util");

(new t.Analyzer({ignore: "**/_random.scss"}))
  .analyze("samples/main.scss")
  .catch(t => console.error("err",t))
  
  .then(t => console.log(JSON.stringify(t,null,2)))//, util.inspect(t,{depth:null})));
/*
  new t.Analyzer().analyze("samples/main.scss", undefined)
 .catch(e => console.error(e))
   .then(t => console.log(t));
   */