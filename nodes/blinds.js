module.exports = function(RED) {
  function add(config) {
    RED.nodes.createNode(this, config);
    const utils = require("./utils/getcontextStorage.js");
    const contextPersist = utils.getPersistContext(RED);
    const node = this;
    node.config = config;
    node.config.timeUp = parseInt((node.config.timeUp * 1000) || 40);
    node.config.timeDown = parseInt((node.config.timeDown * 1000) || 40);
    node.config.AzimutStart = parseInt(node.config.AzimutStart || 110);
    node.config.AzimutEnd = parseInt(node.config.AzimutEnd || 210);
    node.config.sunHeightMin = parseInt(node.config.sunHeightMin || 30);
    node.config.tempMin = parseInt(node.config.tempMin);

    let input = node.context().get("intern", contextPersist) || {
      tempAkt: 0,
      fahren: false,
      automatik: false,
      hoehe: 0,
      winkel: 0,

    };
    let intern = node.context().get("intern", contextPersist) || {
      automaticInUse: false,
      stand: "",
      block: false,
      tempBesch: false,
      auf: false,
      ab: false,
    }

    function sender(out1,out2,out3,out4) {
      function name(item){
        if ((item === null) || (item === undefined)) {
          return null
        } else {
          return {payload:item}
        }
      }
      return [name(out1),name(out2),name(out3),name(out4)];
    }

    function Motorfahren(richtung)  {
      intern.auf = false;
			intern.ab = false;
			clearTimeout(node.timerAuf);
			clearTimeout(node.timerAb);
			node.send(sender(intern.auf,intern.ab,null,null));
			umkehrzeit(richtung);
    }

    function timer(richtung) {
		  if (richtung === "auf") {
			  intern.auf = true;
        intern.stand = "auf";
			  node.send(sender(intern.auf,null));
			  node.timerAuf = setTimeout(stop, node.config.timeUp);
			  node.status({ "fill": "blue", "shape": "dot", "text": "Fahre AUF. Fahrzeit: " + node.config.timeUp + "ms"});
		  } else if (richtung === "ab") {
			  intern.ab = true;
        intern.stand = "ab";
			  node.send(sender(null,intern.ab));
			  node.timerAb = setTimeout(stop, node.config.timeUp);
			  node.status({ "fill": "blue", "shape": "dot", "text": "Fahre AB. Fahrzeit: "  + node.config.timeUp + "ms"});
			}
	  }

    function stop() {
		  intern.auf = false;
		  intern.ab = false ;
		  node.send(sender(intern.auf,intern.ab));
		  node.status({ "fill": "green", "shape": "dot", "text": "steht still. Letzte Fahrtrichtung: " + intern.stand});
	   }

    function umkehrzeit(richtung) {
      setTimeout(timer, 100, richtung);
      node.status({ "fill": "red", "shape": "dot", "text": "Umkehrzeit aktiv"});
	   }

	  function cyclic() {
      if ((input.automatik) && (input.winkel > node.config.AzimutStart) && (input.winkel < node.config.AzimutEnd) && (input.hoehe > node.config.sunHeightMin) && (intern.tempBesch)) { // Wenn Beschattung aktiv
        intern.automaticInUse = true;
        if (intern.stand === "ab") {         // Wenn noch nicht unten
        } else {
          Motorfahren("ab");          // dann abfahren
        }
      } else {                        // Wenn Beschattung nicht mehr aktiv
        intern.automaticInUse = false;
        if (intern.stand === "auf") {        //Wenn noch unten
          } else {
          Motorfahren("auf");         //dann auffahren
        }
      }
      node.send(sender(null,null,intern.automaticInUse,input.automatik));
	  }

    // var block damit bei temp änderung oder Beschattung aktivieren/deaktivieren keine Fahrt ausgelöst wird
	  node.on("input", (msg) => {
      switch (msg.topic) {
        case "fahren":
        input.fahren = msg.payload;
        break;
        case "automatik":
        intern.block = true;
        input.automatik = msg.payload;
        cyclic();
        break;
        case "temp":
        intern.block = true;
        input.tempAkt = msg.payload;
        break;
        case "sunElevation":
        input.hoehe = msg.payload;
        break;
        case "sunAzimut":
        input.winkel = msg.payload;
        break;
      }

  		if ((input.fahren === true) && (intern.block === false)) { // AB
  			Motorfahren("ab");
  			input.fahren = undefined;
      } else if (intern.block === false) {
        Motorfahren("auf");
  			input.fahren = undefined;
      }

      // Hysterese, damit bei Temp. Schwankungen nicht auf/ab gefahren wird
      if (input.tempAkt > (node.config.tempMin + 0.2))  {
        intern.tempBesch = true;
      } else if (input.tempAkt < (node.config.tempMin - 0.2)) {
        intern.tempBesch = false;
      }

      intern.block = false;
	  });

    // Events beim Flow starten
    RED.events.once("nodes-started", () => {
    	node.functioncyclic = setInterval(cyclic,60000);
    });

    // Events beim Beenden der Flows, Deploy
    node.on("close", function(removed, done) {
      clearInterval(node.functioncyclic);
      done();
    });
  };
  RED.nodes.registerType("blinds", add);
}
