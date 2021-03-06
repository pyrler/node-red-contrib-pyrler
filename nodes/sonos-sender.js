module.exports = function(RED) {

  function add(config) {
    RED.nodes.createNode(this, config);
    const utils = require("./utils/getcontextStorage.js");

    const node = this;
    node.config = config;
    let contextPersist = utils.getPersistContext(RED);
    intern = node.context().get("intern", contextPersist) || {
      playmode: 'stop',
      currentstation: -1,
      volume: 5,
      volume_old: 0,
      selectedstation: undefined,
      selectedstation_old: undefined,
      stations: []
    }
    const clearIntervalRequest = () => {
      if (node.intervalRequest) {
        clearInterval(node.intervalRequest);
      }
      node.intervalRequest = null;
    };

    node.on("input", (msg) => {
      msg.topic = msg.topic.toLowerCase();
      switch (msg.topic){
        case "state":
          if (msg.state === "stopped") {
            intern.playmode = "stopped";
          } else if (msg.state === "playing") {
            intern.playmode = "play";
          } else if (msg.state === "paused") {
            intern.playmode = "pause";
          }
          node.status({fill: 'green', shape: 'dot', text: 'Mode: ' + intern.playmode});
          node.context().set("intern", intern, contextPersist);
          return;
        case "stationlist":
          intern.stations = msg.payload;
          break;
        case "play":
          if (intern.playmode === 'pause') {
            intern.playmode = 'play';
          } else {
            if (intern.currentstation < intern.stations.length-1) {
              intern.currentstation++;
            } else {
              intern.currentstation = 0;
            }
            let i;
            for (i = 0; i < intern.stations.length; i++) {
              if (intern.currentstation === i) {
                intern.selectedstation = intern.stations[i];
              }
            }
            intern.volume = 5;
            intern.playmode = 'play';
          }
          break;
        case "pause":
          intern.playmode = 'pause';
          intern.volume = null;
          break;
        case "stop":
          intern.playmode = 'stop';
          intern.currentstation = -1;
          intern.volume = null;
          intern.selectedstation = null;
          break;
        case "nextsong":
          intern.playmode = 'next_song';
          intern.volume = null;
          break;
        case "previoussong":
          intern.playmode = 'previous_song';
          intern.volume = null;
          break;
        case "+":
          intern.playmode = '+1';
          break;
        case "-":
          intern.playmode = '-1';
          break;
        case "volume":
          intern.volume = msg.payload;
          break;
        case "toggle":
          intern.playmode = 'toggleplayback';
          intern.volume = null;
          break;
      }


    var output = {};
    if (intern.volume != intern.volume_old) {
      output.volume = intern.volume;
    } else {
      output.volume = null;
    }

    if (intern.selectedstation != intern.selectedstation_old) {
      output.selectedstation = intern.selectedstation;
    } else {
      output.selectedstation = null;
    }

    intern.volume_old = intern.volume;
    intern.selectedstation_old = intern.selectedstation;

    if (node.config.sendmode === "MySonos") {
      node.sendmode = "play_mysonos";
    } else if (node.config.sendmode === "tuneInID")  {
      node.sendmode = "play_tunein";
    }

    node.send([{payload: intern.playmode}, {payload: node.sendmode, topic: output.selectedstation, volume: output.volume}, {payload: "get_volume"}, {payload: "get_songinfo", suppressWarnings: true},{payload: "get_basics"}]);
    node.status({fill: 'green', shape: 'dot', text: 'Mode: ' + intern.playmode + ' | Station: ' + output.selectedstation});
    node.context().set("intern", intern, contextPersist);
    });

    RED.events.once("nodes-started", () => {
      if (!node.intervalRequest) {
        node.intervalRequest = setInterval(function(){node.send([null, null, {payload: "get_volume"}, {payload: "get_songinfo", suppressWarnings: true},{payload: "get_basics"}]); }, 10 * 1000);
      }
    });

    node.on("close", function(removed, done) {
      clearIntervalRequest();
      done();
    });

  };
  RED.nodes.registerType("sonos-sender", add);
}
