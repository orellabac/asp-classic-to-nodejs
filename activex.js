var config = require("./config");

class COMIterator {
    constructor(obj) {
        this.obj = obj;
        if (obj.Items)
        {
            this.iter = this.obj.Items._NewEnum();
        }
        else {
            this.iter = this.obj._NewEnum;
        }
    }
    [Symbol.iterator]() {
        var localIter = this.iter;
        return function*() {
            if (localIter) {
                var value = undefined;
                debugger;
                do {
                    value = localIter.Next();
                    if (value !== undefined)
                        yield value;
                } while(value !== undefined);
            }
        }();
    }
} 
    // {
    //     var foo = function() 
    //     {
    //       return 
    //       {
    //           const newEnum = obj._NewEnum;
    //           next: function next() 
    //           {
    //             if (!newEnum) 
    //               return { done: true, value: undefined };
    //             var value = newEnum.Next();
    //             return { done: value == undefined, value: value };
    //           }
    //       }
    //     };
    //     var res = {};
    //     res[Symbol.iterator] = foo;
    //     return res;
    // }
function CreateObject(classid) {
    // If you are running on another OS. 
    // The it is better to provide an alternate implementation
    var newClass = config.activexmappings[classid];
    if (newClass) {
        var newRef = require(newClass);
        return newRef;
    }
    else {
        // If none is found then try to use the COM object
       try {
        var winax = require('winax');     
        var newactiveX = winax.Object(classid);
        return newactiveX;
       }
       catch(e) {
           console.error("Either win32ole not found or the " + classid);
           return {};
       }
    }
}

module.exports.newIter = COMIterator;
module.exports.CreateObject = CreateObject;