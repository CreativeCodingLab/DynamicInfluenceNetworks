
var App = App || {};

// iife executed on script load
(function() {
  App.timeWindow = [0, 0];
  App.data = {};
  App.item = 0; // starting with the first item

  App.panels = {
    forceDirected: {}
  };

  App.init = function() {
    var url = document.URL.split('?')[1] || "MiniKaiRun/flux_0.json";
    App.loadData(url, true);
    new Toolbar(App);
    App.animation = new AnimationManager();
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

    ['timeSlider', 'infSlider'].forEach(function(slider) {
      if (App[slider]) {
        App[slider].resize();
      }
    });

    App.phenotype.resize();
  }

  App.draw = function() {
    createSVGs();

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
    App.panels.topVis = new LineGraph('#topVis', {out: false});
    App.panels.bottomVis = new LineGraph('#bottomVis', {out: true});
    App.panels.focusSlider = new FocusSlider('#focusSlider');
    if (!App.phenotype) {
      App.phenotype = new Phenotype({path: 'data/PreyPred/data.csv'});
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
    d3.select('.ui-data')
      .classed('error', false)
      .classed('loading', false)
      .classed('done', true);
    App.dataset = dataset.map(json => {

      var obj = {};

      obj.timeWindow = [+json.bioBeginTime, +json.bioEndTime];

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
    App.animation.setTotalTimesteps(App.dataset.length);
    App.draw();
  };

  App.resetData = function(dataset, csv) {
    // remove all children of svg
    App.panels.forceDirected.simulation.stop();
    App.panels.forceDirected.svg.selectAll('*').remove();
    App.panels.forceDirected.tip.remove();

    // remove line graphs
    d3.selectAll('.row').selectAll('*').remove();

    if (csv) {
      App.phenotype = new Phenotype({data: csv});
      // App.phenotype.resetCSV(csv);
    }
    App.handleData(dataset);
  };

  function initSliders() {
    // set up a time slider
    if (App.dataset.length > 1) {
      App.timeSlider = new Slider( {
        title: 'Time',
        domain: [ 0, App.dataset.length-1 ],
        left: -300
      } );

      App.timeSlider.onDrag = function(x) {
        var t = Math.round(this.value);
        if (t != App.item) {
          if (App.animation) {
            App.animation.isPlaying = false;
            d3.select('.ppIcon').classed('paused', false);
          }
          App.item = t;
          var tw = App.dataset[t].timeWindow.map(n => Number(n.toFixed(2)));
          this.setTitle( 'Time: ' + tw[0] + '-' + tw[1]);
          App.data = App.dataset[t].data;
          App.updateTimestep();
        }
      }
      App.timeSlider.onDragEnd = function() {
        App.animation.currentTime = Math.round(this.value);

        App.panels.forceDirected.simulation
          .alpha(0.3)
          .restart();
      }

      App.animation.attachToSlider(App.timeSlider);
      // append slider to force directed
    }

    App.updateTimestep = function() {
      App.panels.forceDirected.updateData(App.data);
      App.panels.topVis.drawMarkers();
      App.phenotype.drawMarkers();
      App.panels.bottomVis.drawMarkers();
      App.infSlider.setDomain(infDomain());
    }

    // set up an influence slider
    // get min of max inf
    function infDomain() {
      var data = App.panels.forceDirected.filteredData;
      var maxs = Object.keys(data).map(k => {
        var infMax = d3.max(data[k].inf, d => Math.abs(d.flux)) || 0;
        var outfMax = d3.max(data[k].outf, d => Math.abs(d.flux)) || 0;
        return Math.max(infMax, outfMax);
      });
      return [d3.min(maxs), App.panels.forceDirected.maxInfl];
    }
    App.infSlider = new Slider( {
      title: 'Influence > ' + App.panels.forceDirected.threshold.toPrecision(3),
      domain: infDomain(),
      log: true,
      tabs: ['Clustering', 'Visibility']
    });

    // insert value into input thing
    document.getElementById('set-threshold').value = App.panels.forceDirected.threshold;

    App.infSlider.setPosition( App.panels.forceDirected.threshold );
    App.infSlider.onDrag = function(x, evt) {
      var inf = this.value;
      this.setTitle('Influence > ' + inf.toPrecision(3));

      if (this.activeTab == 1) {
        inf === this.domain[0] ? App.panels.forceDirected.visThreshold = 0 : App.panels.forceDirected.visThreshold = inf;
        App.panels.forceDirected.updateEdgeVisibility();
      }
      else {
        App.panels.forceDirected.threshold = inf;
        App.panels.forceDirected.defineClusters(inf);
        App.panels.forceDirected.drawGraph();
        App.panels.topVis.drawMarkers();
        App.panels.bottomVis.drawMarkers();

        // insert value into input thing
        document.getElementById('set-threshold').value = inf;
      }
    }
    App.infSlider.onTabClick = function(x) {
      var inf = this.value;
      this.setTitle('Influence > ' + inf.toPrecision(3));
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
        var rect = App.panels[key].svg.node().getBoundingClientRect();
        App.panels[key].width = rect.width;
        App.panels[key].height = rect.height;
      }
    }
  }

})();
