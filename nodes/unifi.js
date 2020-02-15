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

    node.on("input", (msg) => {
      if (msg.mac != undefined) {
        intern.mac = msg.mac;
      }
      if (msg.payload != undefined) {
        input = msg.payload;
      }

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
    });
  };
  RED.nodes.registerType("unifi", add);
}
