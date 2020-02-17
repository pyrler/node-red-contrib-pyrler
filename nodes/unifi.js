module.exports = function(RED) {

  function add(config) {
    RED.nodes.createNode(this, config);
    const utils = require("./utils/getcontextStorage.js");
    let contextPersist = utils.getPersistContext(RED);
    intern = node.context().get("intern", contextPersist) || {
      mac: ""
    }

    const node = this;
    node.config = config;
    let input = [];

    var unifi = require('node-unifi');
    var username = node.credentials.username;
    var password = node.credentials.password;
    var site = config.site;
    var ip = config.ip;
    var port = config.port;
    var command = config.command;
		
    var controller = new unifi.Controller(ip, port);

    const STATUS_OK = {
        fill: "green",
        shape: "dot",
        text: "OK"
    };

    function sendData(data) {
	controller.logout();	
	msg.payload = data;
	node.send(msg);
	node.status(STATUS_OK);         
    }

    node.on("input", (msg) => {
      if (msg.mac != undefined) {
        intern.mac = msg.mac;
      }
      if (msg.payload != undefined) {
        input = msg.payload;
      }

      controller.login(username, password, function(err) {
	if(err) {
	  console.log('ERROR: ' + err);
	  node.status({
	  fill: "red",
	  shape: "dot",
	  text: err
	});
	return;
      }

      controller.getEvents(site, function(err, events_data) {
         if(err) {
		console.log('ERROR: ' + err);
		node.status({
		fill: "red",
		shape: "dot",
		text: err
	  });
	  return;
          } else {
             sendData(events_data);
	  }
       });


      if (mac != undefined && input.length != 0) {
        var matchingEntries = input[0].filter(function(element) {
          return element.user === mac;
        });
        if (matchingEntries.length === 0) {
        // no matching entires - don't return anything
          return;
        }

        var element = matchingEntries[0];

        if (element.key == "EVT_WU_Disconnected") {
          node.send({payload: false});
          node.status({fill: 'red', shape: 'dot', text: "Offline"});
        } else if (element.key == "EVT_WU_Connected")  {
          node.send({payload: true});
          node.status({fill: 'green', shape: 'dot', text: "Online"});
        }
      }
    node.context().set("intern", intern, contextPersist);
    });
  };
  RED.nodes.registerType("unifi", add,{
     credentials: {
         username: {type:"text"},
         password: {type:"password"}
     }
  });


}
