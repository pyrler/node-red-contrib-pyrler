module.exports = function(RED) {

  function add(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    node.config = config;
    let mac = "";
    let element = "";

    node.on("input", (msg) => {
      if (msg.mac != undefined) {
        mac = msg.mac;
      }
      if (mac != undefined && msg.payload != undefined) {
        var matchingEntries = msg.payload[0].filter(function(element) {
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

      // First, search the array for any entries matching the required mac address

    });
  };
  RED.nodes.registerType("unifi", add);
}
