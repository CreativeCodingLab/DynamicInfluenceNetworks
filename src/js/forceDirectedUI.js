var App = App || {};
window.addEventListener('load', function() {
    // --- toolbar --- //
    document.getElementById('toolbar-close').onclick = function() {
      document.getElementById('toolbar').classList.toggle('closed');
    }

    var dx = 0;
    document.getElementById('toolbar-nav-left').onclick = function() {
      var interval = window.innerWidth / 5;
      dx = Math.min(dx + interval, 0);
      document.querySelectorAll('#toolbar>span').forEach(span => span.style.transform = 'translateX(' + dx + 'px)');
    }
    document.getElementById('toolbar-nav-right').onclick = function() {
      var interval = window.innerWidth / 5;
      var xMax = document.getElementById('toolbar-nav-right').getBoundingClientRect().right;
      var xSpan = document.querySelector('#toolbar>span:last-of-type').getBoundingClientRect().right;

      dx = Math.min(dx - Math.min(interval, xSpan - xMax), 0);

      document.querySelectorAll('#toolbar>span').forEach(span => span.style.transform = 'translateX(' + dx + 'px)');
    }

    document.getElementById('label-size-slider').onchange = function(e) {
      var fontSize = (8 + 0.12 * this.value);
      d3.selectAll('.rule-text')
        .style('font-size', fontSize + 'px');
    }



    App.property = {};
    var self = this;

    this._togglesci = function(e) {
      App.property.sci = this.checked;
    };

    this._togglehide = function(e) {
      let key = this.id.split('-').indexOf('positive') > -1 ? 'green' : 'red';

      if (!this.checked) {
        App.property[key] = true;
        // make links invisible
        d3.selectAll('.link-1')
          .transition()
          .style('stroke-opacity', function() {
            return this.style.stroke.indexOf(key) > -1 ? 0 :
                this.style['stroke-opacity']
          });

        // remove mouseover functionality
        d3.selectAll('.link-2')
          .attr('pointer-events', function() {
            return this.style.stroke.indexOf(key) > -1 ? 'none' :
                this.getAttribute('pointer-events')
          });
      }
      else {
        App.property[key] = false;
        let threshold = Math.abs(App.panels.forceDirected.threshold);
        // make links visible
        d3.selectAll('.link-1')
          .transition()
          .style('stroke-opacity', function(d) {
            if(App.property.link == true) {
              return Math.abs(d.value) >= threshold && this.style.stroke.indexOf(key) > -1 ? 1 :
                this.style['stroke-opacity']
            }
            else {
              return this.style.stroke.indexOf(key) > -1 ? 1 :
                this.style['stroke-opacity']
            }
          });

        // return mouseover functionality
        d3.selectAll('.link-2')
          .attr('pointer-events', function(d) {
            if(App.property.link == true) {
              return Math.abs(d.value) > threshold && this.style.stroke.indexOf(key) > -1? 'all' :
                this.getAttribute('pointer-events')
            }
            else {
              return this.style.stroke.indexOf(key) > -1 ? 'all' :
                this.getAttribute('pointer-events')
            }
          });
      }
    };

    this._toggleshow = function(e) {
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


    this._unpin = function(e) {
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

    // add listeners
    [].slice.call(document.querySelectorAll('.control input[type="checkbox"]'))
        .forEach((checkbox) => {
            checkbox.addEventListener('change',
                self['_toggle'+checkbox.id.split('-')[0]]);
        });

    [].slice.call(document.querySelectorAll('.control button'))
        .forEach((button) => {
            button.addEventListener('click', self['_'+button.id]);
        });

    //-------------- file handler -------------------//

    // from global zip-js
    zip.workerScriptsPath = './lib/WebContent/';

    // prevent form submission on click
    this._changeFile = function(e) {
      e.stopPropagation();
      e.preventDefault();
    };
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

});
