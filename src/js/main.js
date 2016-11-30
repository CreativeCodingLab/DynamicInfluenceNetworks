
var App = App || {};

// iife executed on script load
(function() {
  App.timeWindow = [0, 0];
  App.data = {};

  App.panels = {
    forceDirected: {}
  };

  App.init = function() {
    App.loadData("flux_0.json", true);
    createSVGs();
  }

  App.resize = function() {
    // get new sizes of SVGs (using viewBox with SVG gives us resize for free..)
    getDimSVGs();

    // call any necessary resize methods for visualization


  }

  App.draw = function() {
    // put function calls here to draw
    ForceDirectedGraph.call(App.panels.forceDirected);
  }

  App.loadData = function(file, isSeries) {
    var dir = './data/';

    var isFormattedSeries = isSeries;
    if (isSeries) {
      // attempt to load a series of files
      var fformat = file.match(/^(.*)(\d+)(.*)$/);
      if (fformat && fformat.length > 3) {
        var prefix =  fformat[1],
            num    = +fformat[2],
            suffix =  fformat[3];

        var datasets = [];

        // recursively load next file
        function loadNext(err, json) {
          if (!err) {
            ++num;
            datasets.push(json);
            d3.json ( dir + prefix + num + suffix, loadNext );
          }
          else if (datasets.length > 0) {
            // success!!
            App.handleData(datasets);
          }
          else {
            console.log('Error', err);
          }
        }

        d3.json(dir + file, loadNext);
      }
      else {
        isFormattedSeries = false;
      }
    }
    if (!isFormattedSeries) {
      // attempt to load a single file
      d3.json(dir + file, (err, json) => {
        if (err) {
          console.log('Error',err);
          return;
        }
        // success!!
        App.handleData([json])
      })
    }
  };

  App.handleData = function(dataset) {
    var json = dataset[0];

    if (json.bioBeginTime && json.bioEndTime) {
      App.timeWindow = [json.bioBeginTime, json.bioEndTime];
    }

    console.log(json);

    for(var n in json.rules) {
      App.data[json.rules[n]] = {
        name: json.rules[n],
        hits: json.hits[n],
        inf: json.rules.map((el, i) => {
          return {
            name: el,
            flux: json.fluxs[n][i]
          };
        }),
        outf: json.rules.map((el, i) => {
          return {
            name: el,
            flux: json.fluxs[i][n]
          }
        })
      };
    }

    App.draw();
  };

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
