function Toolbar(App) {
  App.property = {
    sci: false,
    label: false,
    labelFontSize:14,
    green: false,
    red: false
  };

  // --- toolbar --- //
  // open toolbar
  document.getElementById('toolbar-close').onclick = function() {
    document.getElementById('toolbar').classList.toggle('closed');
  };

  // navigate toolbar
  var dx = 0;
  document.getElementById('toolbar-nav-left').onclick = function() {
    var interval = window.innerWidth / 5;
    dx = Math.min(dx + interval, 0);
    document.querySelectorAll('#toolbar>span').forEach(span => span.style.transform = 'translateX(' + dx + 'px)');
  };
  document.getElementById('toolbar-nav-right').onclick = function() {
    var interval = window.innerWidth / 5;
    var xMax = document.getElementById('toolbar-nav-right').getBoundingClientRect().right;
    var xSpan = document.querySelector('#toolbar>span:last-of-type').getBoundingClientRect().right;

    dx = Math.min(dx - Math.min(interval, xSpan - xMax), 0);

    document.querySelectorAll('#toolbar>span').forEach(span => span.style.transform = 'translateX(' + dx + 'px)');
  };

  // toggle scientific notation
  document.getElementById('sci').onchange = function() {
    App.property.sci = this.checked;
  };

  // toggle label visibility
  document.getElementById('show-labels').onchange = function() {
    if(this.checked) {
      App.property.label = true;
      d3.selectAll('.rule-text')
        .transition()
        .style('opacity', function(d) {
          if (App.property.node == true && d.cluster === 0) {
            return 0;
          }
          return 0.9;
        })
    }
    else {
     App.property.label = false;
     d3.selectAll('.rule-text')
        .transition()
        .style('opacity', 0)
    }
  };

  // change label size
  document.getElementById('label-size-slider').onchange = function(e) {
    var fontSize = (8 + 0.12 * this.value);
    d3.selectAll('.rule-text')
      .style('font-size', fontSize + 'px');
    App.property.labelFontSize = fontSize;
  };

  // toggle edge visibility
  document.getElementById('hide-positive').onchange = function() {
    App.property.green = this.checked;
    App.panels.forceDirected.updateEdgeVisibility();
  };
  document.getElementById('hide-negative').onchange = function() {
    App.property.red = this.checked;
    App.panels.forceDirected.updateEdgeVisibility();
  };

  // pin and unpin nodes
  document.getElementById('unpin').onclick = function() {
    for (var node in App.panels.forceDirected.filteredData) {
        App.panels.forceDirected.filteredData[node]._fixed = false;
        App.panels.forceDirected.filteredData[node].fx = null;
        App.panels.forceDirected.filteredData[node].fy = null;
    }
    d3.selectAll('.rule-node')
      .style("fill", d => App.panels.forceDirected.clusterColor(d.cluster))
      .style("stroke", "white");

    d3.selectAll(".clusterCircle")
      .style("stroke-dasharray", "2, 2");

    App.panels.forceDirected.simulation.alpha(0.1).restart();
  };

  document.getElementById('pin').onclick = function() {
    for (var node in App.panels.forceDirected.filteredData) {
        App.panels.forceDirected.filteredData[node]._fixed = true;
        App.panels.forceDirected.filteredData[node].fx = App.panels.forceDirected.filteredData[node].x;
        App.panels.forceDirected.filteredData[node].fy = App.panels.forceDirected.filteredData[node].y;
    }
    d3.selectAll('.rule-node')
      .style('stroke', '#404040');
    d3.selectAll('.clusterCircle')
      .style("stroke-dasharray", null);
  };

  // change colors
  document.getElementById('theme').onclick = function() {
    var theme = this.checked ? {
        red: [
          '#fee090',
          '#fdae61',
          '#f46d43',
          '#d73027'
        ],
        green: [
          '#e0f3f8',
          '#abd9e9',
          '#74add1',
          '#4575b4'
        ]
      } : {
        red: [
          '#fee08b',
          '#fdae61',
          '#f46d43',
          '#d73027'
        ],
        green: [
          '#d9ef8b',
          '#a6d96a',
          '#66bd63',
          '#1a9850'
        ]
      };
    d3.select('.theme-color.neg')
      .style('background-image', 'linear-gradient(to top,' + theme.red.join(',') + ')');
    d3.select('.theme-color.neg')
      .style('background-image', 'linear-gradient(to top,' + theme.green.join(',') + ')');
    d3.selectAll('#redLeft stop')
      .attr('stop-color', (d,i) => theme.red[i]);
    d3.selectAll('#greenLeft stop')
      .attr('stop-color', (d,i) => theme.green[i]);
  }

  //-------------- file handler -------------------//

  // from global zip-js
  zip.workerScriptsPath = './lib/WebContent/';

  // open
  document.getElementById('changeFile').onclick = function() {
    document.getElementById('input').click();
  }
  document.body.addEventListener('dragover', handleDragOver, false);
  document.body.addEventListener('drop', handleDrop, false);
  document.getElementById('input').addEventListener('change', handleInput, false);

  // add drag/drop handler
  function handleDrop(e) {
      e.stopPropagation();
      e.preventDefault();
      handleFile(e.dataTransfer.files);
  }

  // this just changes the cursor hover effect
  function handleDragOver(e) {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
  }

  function handleInput(evt) {
    handleFile(evt.target.files);
    document.getElementById('form').reset();
  }

  function handleFile(files) {
    if (!(files && files.length > 0)) { return; }

    var file = files[0];
    if (file) {
      // check if file is zip or json
      if (file.type === 'application/zip') {
        d3.select('#filename')
          .text('Reading file: ' +file.name);
        readZipFile(file);
      }
      else if (file.type === 'application/json') {
        d3.select('#filename')
          .text('Reading file: ' +file.name);
        readJsonFile(file);
      }
    }
  }

  function readJsonFile(file) {
    var fr = new FileReader();
    fr.onload = function(e) {
      try {
        var parsedJson = JSON.parse(e.target.result);
        App.resetData([parsedJson]);
      }
      catch (err) {
        d3.select('#filename')
          .text('Error parsing file');
        console.log('error parsing file', err)
      }
    }
    fr.readAsText(file);
  }

  function readZipFile(blob) {
      var fs = new zip.fs.FS();
      fs.importBlob(blob, function() {
          // DFS for a json file, reading files before directories
          var parent = null;

          function findJson(root) {
              if ( root.children.some(entry => {
                  return entry.name.endsWith('.json') &&
                      !entry.directory;
              }) ) {
                  parent = root;
                  return true;
              }

              return root.children.filter(entry => entry.directory)
                  .some(child => findJson(child));
          }

          findJson(fs.root);

          if (parent) {
              var children = parent.children.filter( file => file.name.endsWith(".json") );
              parseFiles(children);
          }
          else {
            d3.select('#filename')
              .text('Could not find a .json file');
            console.log('no json files found');
          }

      }, function(err) {
          d3.select('#filename')
            .text('Could not read zip file');
          console.log('error',err);
      });
  }

  function parseFiles(files) {
      var series = files.filter(f => f.name.match(/\d+/));
      if (series.length < 1) {
          // read single file
          series = [files[0]];
      }
      else {
          // read a series of files
          series.sort( (a,b) => {
              return +(a.name.match(/\d+/)[0]) - (b.name.match(/\d+/)[0]);
          });
      }

      var datasets = [];

      function getDatasets(i) {
        if (i >= series.length) {
          // stop
          App.resetData(datasets);
          return;
        }
        series[i].getText(function(text) {
          try {
            var parsedJSON = JSON.parse(text);
            if (parsedJSON) {
              datasets.push(parsedJSON);
            }
            getDatasets(i+1);
          }
          catch (e) {
            d3.select('#filename')
              .text('Error reading file...');
            console.log('error',e);
            App.resetData(datasets);
          }
        })
      };

      getDatasets(0);
  }

};
