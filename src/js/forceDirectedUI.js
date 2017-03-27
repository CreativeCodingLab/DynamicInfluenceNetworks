function Toolbar(App) {
  App.property = {
    sci: document.getElementById('sci').checked,
    label: document.getElementById('show-labels').checked,
    labelFontSize: 8 + 0.12 * document.getElementById('label-size-slider').value,
    green: document.getElementById('hide-positive').checked,
    red: document.getElementById('hide-negative').checked,
    pin: false
  };

  // --- toolbar --- //
  // open toolbar
  document.addEventListener('click', function(e) {
    var target = e.target;
    switch (target.nodeName.toLowerCase()) {
      case 'h4':
        target = target.parentNode;

        if (target.id === 'help') {
          target.classList.toggle('active');
          break;
        }

        if (target.classList.contains('active') && target.classList.contains('ui')) {
          target.classList.remove('active');
          break;
        }
      case 'span':
        if (target.classList.contains('ui')) {
          document.querySelectorAll('.ui.active').forEach(el => el.classList.remove('active'));
          target.classList.add('active');
          break;
        }
      default:
        while (target !== document.body) {
          target = target.parentNode;
          if (target.id === 'toolbar') { return; }
        }
        document.querySelectorAll('.ui.active').forEach(el => el.classList.remove('active'));
        break;
    }
  });

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

  // set specifically the clustering threshold
  document.getElementById('set-threshold').onkeyup = function(e) {
    if (e.key == "Enter") { // enter
      let inf = parseFloat(this.value);

      // update clustering threshold
      App.panels.forceDirected.threshold = inf;
      App.panels.forceDirected.defineClusters(inf);
      App.panels.forceDirected.drawGraph();
      App.panels.topVis.drawMarkers();
      App.panels.bottomVis.drawMarkers();

      App.infSlider.setPosition(inf);
      App.infSlider.setTitle('Influence > ' + inf.toPrecision(3));
    }
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
        .style('opacity', 1);
    }
    else {
     App.property.label = false;
     d3.selectAll('.rule-text')
        .transition()
        .style('opacity', d => (d.isPainted && d3.schemeCategory20.indexOf(d.paintedCluster) >= 8) ? 1 : 0);
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
    App.property.pin = false;
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
    App.property.pin = true;
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

  // paint clusters
  var lastPaintingColor = null;
  function setActiveColor(clusterNumber) {
    lastPaintingColor = clusterNumber;
    var className = 'cs' + clusterNumber;
    document.querySelectorAll('.cs').forEach(cs => {
      cs.classList.toggle('active', cs.classList.contains(className));
    });

    App.panels.forceDirected.paintingManager.startPaintingNewCluster(lastPaintingColor);
    document.querySelector('.ui-mark h4 span').style.backgroundColor = d3.schemeCategory20[lastPaintingColor] || 'black';
  }
  document.getElementById('paint-start').onchange = function() {
    document.getElementById('palette').classList.toggle('active', this.checked);
    document.body.classList.toggle('painting', this.checked);
    if (this.checked) {

      // preset to default painting color
      if (lastPaintingColor === null) {
        if (App.panels.forceDirected.clusterColors) {
          lastPaintingColor = d3.schemeCategory20.findIndex(c => App.panels.forceDirected.clusterColors.indexOf(c === -1));
          if (lastPaintingColor === null) { lastPaintingColor = 19; }
        }
        else {
          lastPaintingColor = App.panels.forceDirected.clusters.length;
        }
      }

      setActiveColor(lastPaintingColor);
    }
    else {
      App.panels.forceDirected.paintingManager.stopPaintingCluster();
    }
  }
  document.getElementById('paint-reset').onclick = function() {
    App.panels.forceDirected.paintingManager.unPaintAllNodes();
    App.panels.forceDirected.paintingManager.stopPaintingCluster();
    var paintStart = document.getElementById('paint-start');
    if (paintStart && paintStart.checked) {
      paintStart.click();
    }
  }

  document.querySelectorAll('#palette .cs').forEach(cs => {
    cs.onclick = function() {
      var i = +this.className.match(/\d+/);
      setActiveColor(i);
    }
  });

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
      .style('background-image', 'linear-gradient(to right,' + theme.red.join(',') + ')');
    d3.select('.theme-color.neg')
      .style('background-image', 'linear-gradient(to right,' + theme.green.join(',') + ')');
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
      d3.select('.ui-data')
        .classed('error', false)
        .classed('loading', true)
        .classed('done', false);

      // check if file is zip or json
      if (file.type === 'application/zip') {
        d3.select('#filename')
          .text(file.name);
        readZipFile(file);
      }
      else if (file.type === 'application/json') {
        d3.select('#filename')
          .text(file.name);
        readJsonFile(file);
      }
    }
  }

  function FileException(err) {
    d3.select('.ui-data')
      .classed('error', true)
      .classed('loading', false)
      .classed('done', false);
    d3.select('#filename')
      .text(err.message);

    this.error = err.error;
  }

  function readJsonFile(file) {
    var fr = new FileReader();
    fr.onload = function(e) {
      try {
        var parsedJson = JSON.parse(e.target.result);
        App.resetData([parsedJson]);
      }
      catch (err) {
        throw new FileException({
          message: "Error parsing file",
          error: err
        });
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
            throw new FileException({
              message: "Could not find a .json file",
              error: 'no json files found'
            });
          }

      }, function(err) {
        throw new FileException({
          message: "Could not read zip file",
          error: err
        });
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
