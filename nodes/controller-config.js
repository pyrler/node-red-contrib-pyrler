module.exports = function(RED) {

  function controllerconfig(config) {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.ip = config.ip;
    this.port = config.port;
    this.username = config.username;
    this.password = config.password;
  };

  RED.nodes.registerType("controller-config", controllerconfig);
}
