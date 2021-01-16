var layoutRegExp = /^@\s*layout\s*\(\s*"([^]*)"\)$/

module.exports = {
  processAST: function (buffer, env) {
  
    return buffer;
  },
  processFnString(res, config) {
   return 'var rW=function(xx) { tR +=xx };' +
   "var Response={Write:(x)=>rW(x)," +
   "ContentType:(x)=>{it.Server.ResponseType=x;}," +
   "Redirect:(x)=>{it.Server.Redirect = x;if(cb){cb(null,tR);return} else return tR; }};" +
   "var Application = it.AppData;"+
   "var page = {exports: it.Server.exports};" +
   "var Request={ QueryString : (x) => it.Request.QueryString(x), Form: (x) => it.Request.Form(x) };" +
   "var Session= it.Server && it.Server.Session;" +
   "var Iter = it.Server && it.Server.Iter;" +
   "var CreateObject = it.Server && it.Server.CreateObject;" +
   "var Split=(x,sep)=>(x || '').split(sep);" +
   "var Server={ " +
   "CreateObject: CreateObject," +
   "MapPath: it.Server && it.Server.MapPath," +
   "Transfer:(x) => { it.Server.TransferURL=x;                    it.Server.ltR = tR;if(cb){cb(null,tR);return} else return tR; }," +
   "Execute: (x) => { it.Server.TransferURL=x;it.Server.Exec=true;if(cb){cb(null,tR);tR += it.Server.ExecRes || ''; return} else return tR; }" +
   "};" + 
   "var takeTransfer = function() { if (it.Server && it.Server.ltR) { var old=it.Server.ltR;it.Server.ltR=null; return old;} else return ''};" +
    res.replace("var tR='',",";var tR=takeTransfer(),");  
    return res;
  },
  processTemplate : function(str, config) {
      return str;
  }
}