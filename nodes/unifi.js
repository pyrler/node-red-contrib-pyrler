module.exports = function(RED) {
  const unifi = require("node-unifi");
  const utils = require("./utils/getcontextStorage.js");
  function add(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.config = config;
    node.controller = RED.nodes.getNode(config.controller);

    node.config.interval = parseInt(node.config.interval);

    if (node.config.intervalcheckbox) {
      if (node.config.interval === 0 || node.config.interval === undefined || isNaN(node.config.interval)) {
        node.error("Unifi: " + node.config.id + ": no intervaltime set!")
        return;
      } else {
        node.config.interval = node.config.interval * 1000;
      }
    }

    var controller = new unifi.Controller(node.controller.ip, node.controller.port);

    const STATUS_OK = {
        fill: "green",
        shape: "dot",
        text: "OK"
    };

    function getClientDevices()  {
      controller.login(node.controller.username, node.controller.password, function(err) {
	      if(err) {
	        console.log('ERROR: ' + err);
	        node.status({
	          fill: "red",
	          shape: "dot",
	          text: err
	        })
	        return;
        } else {
          controller.getClientDevices (config.site, function(err, events_data) {
            if(err) {
              console.log('ERROR: ' + err);
              node.status({
                fill: "red",
                shape: "dot",
                text: err
              })
            return;
            } else {
              var events = events_data[0];
              node.matchingEntries = events.filter(function(element) {
                   return element.mac === node.mac;
               });
              if (node.matchingEntries.length === 0) {
                sendData(false);
              } else {
                sendData(true);
              }
            }
            controller.logout();
          })
        }
      })
    }

    function sendData(data) {
      if (node.config.rbe) {
        if (data != node.data_old) {
          node.send({payload: data});
          // console.log("Output: " + data);
    	    node.status(STATUS_OK);
          node.data_old = data;
        }
      } else {
        node.send({payload: data});
        // console.log("Output: " + data);
  	    node.status(STATUS_OK);
      }
    }

    node.on("input", (msg) => {
      node.mac = msg.payload;
      getClientDevices();
    });

    RED.events.once("flows:started", () => {
      if (node.config.intervalcheckbox) {
        if (!node.functioncyclic) {
          node.functioncyclic = setInterval(getClientDevices, node.config.interval);
        }
      }
    });

    node.on("close", function(removed, done) {
      if (node.config.intervalcheckbox) {
        clearInterval(node.functioncyclic);
      }
      done();
    });

  };
  RED.nodes.registerType("unifi", add);
}
