

// place all global configuration here
class GlobalEvents
{

constructor(app) {
  this.Application = app;
}

application_start() {
  this.Application["visitors"] = 0;
  this.Application["rootURL"] = "/learn-classic-asp";
  this.Application["connectionString"] = "Provider=SQLOLEDB.1;Data Source=localhost;Database=learnasp;User Id=sa;Password=Password1234";
}

async session_start() {
 await this.Application.Lock();
 try {
  this.Application["visitors"] = this.Application["visitors"] + 1;
 }
 finally {
   this.Application.UnLock();
 }
}

async session_end() {
await this.Application.Lock();
  try {
  this.Application["visitors"] = this.Application["visitors"] - 1;
  }
  finally {
    this.Application.UnLock();
  }
}

}

module.exports = GlobalEvents;