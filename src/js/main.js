
var App = App || {};

// iife executed on script load
(function() {
  App.timeWindow = [0, 0];
  App.data = {};

  App.panels = {
    forceDirected: {}
  };

  App.init = function() {
    var url = document.URL.split('?')[1] || "flux_0.json";
    App.loadData(url, true);
    createSVGs();
  }

  App.resize = function() {
    // get new sizes of SVGs (using viewBox with SVG gives us resize for free..)
    getDimSVGs();

    // call any necessary resize methods for visualization
    for(key in App.panels) {
      if (App.panels[key].resize) {
        App.panels[key].resize();
      }
    }
  }

  App.draw = function() {
    // put function calls here to draw
    var fd = App.panels.forceDirected;
    App.panels.forceDirected = new ForceDirectedGraph( { 
      svg: fd.svg,
      width: fd.width,
      height: fd.height
    })

    // instantiate sliders
    initSliders();

    // line graphs
    if (App.dataset.length > 1) {
      App.panels.topVis = new LineGraph('#topVis');
      App.panels.bottomVis = new LineGraph('#bottomVis');
    }
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

        App.format = {prefix: prefix, start:num, suffix:suffix}

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
    App.dataset = dataset.map(json => {

      var obj = {};

      var w = [+json.bioBeginTime, +json.bioEndTime];
      if (!isNaN(w[0]) && !isNaN(w[1])) {
        obj.timeWindow = w,
        obj.timeMean = (w[0]+w[1])/2;
      }

      var data = {};
      for (var n in json.rules) {
        data[json.rules[n]] = {
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
      obj.data = data;

      return obj;
    })

    // init data to first dataset in series
    App.data = App.dataset[0].data;
    App.draw();
  }

  function initSliders() {
    // set up a time slider
    if (App.dataset.length > 1) {
      App.timeSlider = new Slider( '#timeSlider', {
        title: 'Time',
        domain: [ 0, App.dataset.length-1 ]
      } );
      App.timeSlider.onDrag = function(x) {
        var t = Math.round(this.value);
        if (t != App.item) {
          App.item = t;
          this.setPosition(t);
          var tw = App.dataset[t].timeWindow.map(n => Number(n.toFixed(2)));
          this.setTitle( 'Time: ' + tw[0] + '-' + tw[1]);
          App.data = App.dataset[t].data;
          App.panels.forceDirected.updateData(App.data);
          App.panels.topVis.drawMarkers();
          App.panels.bottomVis.drawMarkers();
        }
      }
      App.timeSlider.onDragEnd = function() {
        App.panels.forceDirected.simulation
          .alpha(0.3)
          .restart();
      }

      // append slider to force directed
    }

    // set up an influence slider
    var links = App.panels.forceDirected.sortedLinks;
    var domain = [
                  Math.min(
                      Math.abs(links[links.length-1].value),
                      App.panels.forceDirected.threshold
                    ),
                  Math.max(
                    App.panels.forceDirected.maxInfl,
                    App.panels.forceDirected.threshold
                    )
                ];
    App.infSlider = new Slider( '#clusterSlider', {
      title: 'Influence threshold: ' + App.panels.forceDirected.threshold.toPrecision(3),
      domain: domain,
      log: true
    });
    App.infSlider.setPosition( App.panels.forceDirected.threshold );
    App.infSlider.onDrag = function(x, evt) {
      var inf = this.value;
      this.setTitle('Influence threshold: ' + App.panels.forceDirected.threshold.toPrecision(3));
      App.panels.forceDirected.threshold = inf;
      App.panels.forceDirected.defineClusters(inf);
      App.panels.forceDirected.drawGraph();
    }
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
