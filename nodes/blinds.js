module.exports = function(RED) {

  function add(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    node.config = config;
    node.config.timeAuf = parseInt((node.config.timeAuf * 1000) || 40);
    node.config.timeAb = parseInt((node.config.timeAb * 1000) || 40);
    node.config.sunStart = parseInt(node.config.sunStart || 110);
    node.config.sunEnd = parseInt(node.config.sunEnd || 210);
    node.config.sunHeightMin = parseInt(node.config.sunHeightMin || 30);
    node.config.temp = parseInt(node.config.temp);

    node.sonne_hoehe = RED.nodes.getNode(config.sonne_hoehe) || {};
    node.sonne_winkel = RED.nodes.getNode(config.sonne_winkel) || {};
    node.var_enable = RED.nodes.getNode(config.var_enable) || {};

	var fahren;
	var timerAuf;
	var timerAb;
	var auf;
	var ab;
	var beschattungaktiv;
	var automatik;
  var sonne = new Object();
  var stand;
  var tempAkt;
  var functioncyclic;
  var block;
  var tempBesch;
  var delayStart1;
  var delayStart2;
  var delayStart3;
  var delayStart4;
  var delayStart5;

  const pld = (payload) => {
      return { "payload": payload };
    };


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
      auf = false;
			ab = false;
			clearTimeout(timerAuf);
			clearTimeout(timerAb);
			node.send(sender(auf,ab,null,null));
			umkehrzeit(richtung);
    }

    function timer(richtung) {
		if (richtung === "auf") {
			auf = true;
      stand = "auf";
			node.send(sender(auf,null));
			timerAuf = setTimeout(stop, node.config.timeAuf);
			node.status({ "fill": "blue", "shape": "dot", "text": "Fahre AUF. Fahrzeit: " + node.config.timeAuf + "ms"});
		} else if (richtung === "ab") {
			ab = true;
      stand = "ab";
			node.send(sender(null,ab));
			timerAb = setTimeout(stop, node.config.timeAb);
			node.status({ "fill": "blue", "shape": "dot", "text": "Fahre AB. Fahrzeit: "  + node.config.timeAb + "ms"});
			}
    setStateStand();
	}

    function stop() {
		  auf = false;
		  ab = false ;
		  node.send(sender(auf,ab));
		  node.status({ "fill": "green", "shape": "dot", "text": "steht still. Letzte Fahrtrichtung: " + stand});
	}

    function umkehrzeit(richtung) {
      var umkehrzeitAuf = setTimeout(timer, 100, richtung);
      node.status({ "fill": "red", "shape": "dot", "text": "Umkehrzeit aktiv"});
	}

  function getStateAutomatik()  {
    try {
      automatik = node.context().get("automatik", "persist");
    } catch (e) {
      node.warn("No context for automatik ist set. Automatik is now false");
      automatik = false;
    } finally {

    }
  }

  function setStateAutomatik()  {
     node.context().set("automatik", automatik, "persist");
     //console.log("setStateAutomatik: " + automatik);
  }

  function getGlobalVars()  {
      try {
        sonne.enable = node.context().global.get(node.var_enable.config.var, node.var_enable.config.memory);
      } catch (e) {
        node.warn("No Variable for Beschatten enable is set! Enable is now false")
        sonne.enable = false;
      } finally {
      }
      try {
        sonne.hoehe = node.context().global.get(node.sonne_hoehe.config.var, node.sonne_hoehe.config.memory);
      } catch (e) {
        node.warn("No Variable for Sonne höhe is set! Höhe is now 0")
        sonne.hoehe = 0;
      } finally {
      }
      try {
        sonne.winkel = node.context().global.get(node.sonne_winkel.config.var, node.sonne_winkel.config.memory);
      } catch (e) {
        node.warn("No Variable for Sonne winkel is set! Winkel is now 0")
        sonne.winkel = 0;
      } finally {
      }
      // node.log(sonne.enable);
      // node.log(sonne.hoehe);
      // node.log(sonne.winkel);
  }

  function getStateStand()  {
    try {
      stand = node.context().get("stand", "persist");
    } catch (e) {
      node.warn("No context for stand is set. Stand is now auf")
    } finally {

    }
  }
  function setStateStand()  {
    node.context().set("stand", stand, "persist");
    //console.log("setStateStand: " + stand);
  }

	function cyclic() {
    getStateAutomatik();
		getGlobalVars();
    if ((automatik) && (sonne.winkel > node.config.sunStart) && (sonne.winkel < node.config.sunEnd) && (sonne.hoehe > node.config.sunHeightMin) && (sonne.enable) && (tempBesch)) { // Wenn Beschattung aktiv
      beschattungaktiv = true;
      if (stand === "ab") {         // Wenn noch nicht unten
      } else {
        Motorfahren("ab");          // dann abfahren
      }
    } else {                        // Wenn Beschattung nicht mehr aktiv
      beschattungaktiv = false;
      if (stand === "auf") {        //Wenn noch unten
      } else {
        Motorfahren("auf");         //dann auffahren
      }
    }
    node.send(sender(null,null,beschattungaktiv,automatik));
	}

// Events beim Flow starten
	RED.events.once("nodes-started", () => {
    //delayStart1 = setTimeout(getStateAutomatik, 3000);
    //delayStart2 = setTimeout(getGlobalVars, 3000);
    delayStart3 = setTimeout(getStateStand, 3000);
    delayStart4 = setTimeout(cyclic, 3000);
		//delayStart5 = setTimeout(function(){node.send(sender(null,null,beschattungaktiv,automatik));}, 8000);
    functioncyclic = setInterval(cyclic,60000);
	});




    // var block damit bei temp änderung oder Beschattung aktivieren/deaktivieren keine Fahrt ausgelöst wird
	node.on("input", (msg) => {
    switch (msg.topic) {
      case "fahren":
      fahren = msg.payload;
      break;
      case "automatik":
      block = true;
      automatik = msg.payload;
      setStateAutomatik();
      cyclic();
      break;
      case "temp":
      block = true;
      tempAkt = msg.payload;
      break;
    }


  		if ((fahren === true) && (block === false)) { // AB
  			Motorfahren("ab");
  			fahren = undefined;
        try {
          node.context().global.set(node.var_enable.config.var, false, node.var_enable.config.memory);
        } catch (e) {

        } finally {

        }

      } else if (block === false) {
        Motorfahren("auf");
  			fahren = undefined;
        try {
          node.context().global.set(node.var_enable.config.var, false, node.var_enable.config.memory);
        } catch (e) {

        } finally {

        }
      }  else  {	// AUF
  		}

      // Hysterese, damit bei Temp. Schwankungen nicht auf/ab gefahren wird
      if (tempAkt > (node.config.temp + 0.2))  {
        tempBesch = true;
      } else if (tempAkt < (node.config.temp - 0.2)) {
        tempBesch = false;
      }

      block = false;
      //node.send(sender(null,null,null,automatik));
	  });
    // Events beim Beenden der Flows, Deploy
      node.on("close", function(removed, done) {
        clearInterval(functioncyclic);
        clearTimeout(delayStart1);
        clearTimeout(delayStart2);
        clearTimeout(delayStart3);
        clearTimeout(delayStart4);
        clearTimeout(delayStart5);
        done();
        });
  };

  RED.nodes.registerType("blinds", add);
}
