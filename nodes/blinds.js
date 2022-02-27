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

    let intern = node.context().get("intern", contextPersist) || {
      automatik: false,
      automaticInUse: false,
      handUp: false,
      handDown: false,
      stand: "",
      auf: false,
      ab: false,
      hoehe: 0,
      winkel: 0,
    }

    function sender(out1,out2,out3,out4) {
      function name(item){
        if ((item === null) || (item === undefined)) {
          return null
        } else {
          return {payload:item}
        }
      }
      return [name(out1),name(out2),name(out3),name(out4),name(intern.stand)];
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
			  node.status({ "fill": "blue", "shape": "dot", "text": "Drive Up for time: " + node.config.timeUp/1000 + "s"});
		  } else if (richtung === "ab") {
			  intern.ab = true;
        intern.stand = "ab";
			  node.send(sender(null,intern.ab));
			  node.timerAb = setTimeout(stop, node.config.timeUp);
			  node.status({ "fill": "blue", "shape": "dot", "text": "Drive Down for time: "  + node.config.timeUp/1000 + "s"});
			}
	  }

    function stop() {
		  intern.auf = false;
		  intern.ab = false ;
		  node.send(sender(intern.auf,intern.ab));
		  node.status({ "fill": "green", "shape": "dot", "text": "Stand still"});
	   }

    function umkehrzeit(richtung) {
      setTimeout(timer, 100, richtung);
      node.status({ "fill": "red", "shape": "dot", "text": "Umkehrzeit aktiv"});
	   }

	  function cyclic() {
      if ((intern.automatik) && (intern.winkel > node.config.AzimutStart) && (intern.winkel < node.config.AzimutEnd) && (intern.hoehe > node.config.sunHeightMin)) {
        intern.automaticInUse = true;
        intern.handDown = false;
        if (intern.stand != "ab" && !intern.handUp) {
          Motorfahren("ab");
        }
      } else if (intern.automatik && ((intern.winkel < node.config.AzimutStart) || (intern.winkel > node.config.AzimutEnd) || (intern.hoehe < node.config.sunHeightMin))) {
        intern.automaticInUse = false;
        intern.handUp = false;
        if (intern.stand != "auf" && !intern.handDown) {
          Motorfahren("auf");
        }
      }
      node.context().set("intern",intern, contextPersist);
      node.send(sender(null,null,intern.automaticInUse,intern.automatik,intern.stand));
	  }


	  node.on("input", (msg) => {
      switch (msg.topic) {
        case "fahren":
          intern.automaticInUse = false;
          if (msg.payload) {
            intern.handUp = false;
            intern.handDown = true;
    			  Motorfahren("ab");
          } else {
            intern.handUp = true;
            intern.handDown = false;
            Motorfahren("auf");
          }
        break;
        case "automatik":
          intern.handUp = false;
          intern.handDown = false;
          intern.automatik = msg.payload;
          if (!msg.payload) {
            intern.automaticInUse = false;
          }
          cyclic();
        break;
        case "sunElevation":
          intern.hoehe = msg.payload;
        break;
        case "sunAzimut":
          intern.winkel = msg.payload;
        break;
      }

      node.context().set("intern",intern, contextPersist);
	  });

    // Events beim Flow starten
    RED.events.once("flows:started", () => {
    	node.functioncyclic = setInterval(cyclic,20000);
    });

    // Events beim Beenden der Flows, Deploy
    node.on("close", function(removed, done) {
      clearInterval(node.functioncyclic);
      done();
    });
  };
  RED.nodes.registerType("blinds", add);
}
