
var App = App || {};

// iife executed on script load
(function() {
  App.timeWindow = [0, 0];
  App.data = {};

  App.panels = {
    forceDirected: {}
  };

  App.init = function() {
    App.loadData("Real.json");

    createSVGs();
  }

  App.resize = function() {
    // get new sizes of SVGs (using viewBox with SVG gives us resize for free..)
    getDimSVGs();

    // call any necessary resize methods for visualization


  }

  App.draw = function() {
    // put function calls here to draw
    createForceDirectedGraph();

  }

  App.loadData = function(file) {
    d3.json("./data/" + file, (err, json) => {

      if (json.bioBeginTime && json.bioEndTime) {
        App.timeWindow = [json.bioBeginTime, json.bioEndTime];
      }

      for(var n in json.rules) {
        App.data[json.rules[n]] = {
          name: json.rules[n],
          hits: json.hits[n],
          inf: json.rules.map((el, i) => {
            return {
              name: el,
              flux: json.fluxs[n][i]
            };
          })
        };
      }

      App.draw();
    });
  }

  // creating SVGs in layout
  function createSVGs() {
    for(key in App.panels) {
      if (!App.panels[key].svg) {
        // create svg
        App.panels[key].svg = d3.select("#" + key + "Div")
          .append("svg")
          .attr("class", key + "SVG")
          .attr("width", "100%")
          .attr("height", "100%");

      }
    }

    getDimSVGs();
  }

  // getting the size of the elements in the client window size
  function getDimSVGs() {
    for(key in App.panels) {
      if (App.panels[key].svg) {
        // create svg
        App.panels[key].width = App.panels[key].svg.node().clientWidth;
        App.panels[key].height = App.panels[key].svg.node().clientHeight;

      }
    }
  }

})();
