(function(exports){

  exports.getPersistContext = function (RED){
    var settings = RED.settings;
    var valuesArr = Object.values(settings.contextStorage);
    for (var i = 0; i < valuesArr.length; i++) {
      if (valuesArr[i].module === "localfilesystem") {
        return Object.keys(settings.contextStorage)[i];
      }
    }
  }
})(typeof exports === 'undefined'? this.utils={}: exports);
