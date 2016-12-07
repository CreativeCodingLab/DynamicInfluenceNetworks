var App = App || {};

function ForceDirectedGraph(args) {
  Object.assign(this, args || ForceDirectedGraph.prototype)

  this.init();
  this.filterData(App.data);

  var sortedLinks = this.links.concat().sort((a, b) => {
    return Math.abs(b.value) - Math.abs(a.value);
  });

  this.maxInfl = Math.abs(sortedLinks[0].value);

  this.legend = {};

  this.legend.nodeSizeDomain = 
    d3.extent(Object.keys(this.filteredData), (d) => {
        return this.filteredData[d].hits;
      });
  this.legend.nodeSizeRange = [4, 14];

  this.legend.linkSizeDomain = d3.extent(this.links.map(d => Math.abs(d.value)));
  this.legend.linkSizeRange = d3.extent(d3.range(0.4, this.links.length > 200 ? 1 : 4, 0.05));

  var threshold = sortedLinks[Math.round(Math.sqrt(this.links.length))].value;
  this.defineClusters(Math.abs(threshold));

  // set up simulation
  this.simulation = d3.forceSimulation()
    .force("link",
      d3.forceLink()
        .id(d => d.name)
    )
    .force("collision", d3.forceCollide(22))
    .force("charge", d3.forceManyBody()
      .strength(-Math.pow(150, Object.keys(this.filteredData).length > 30 ? 1 : 1.2))
      .distanceMax(Math.min(this.width, this.height)/4))
    .force("center", d3.forceCenter(
      (this.width / 2),
      (this.height / 2)
    ));

  // update graph
  this.drawGraph();
  this.createLegend();
};

ForceDirectedGraph.prototype = {
  constructor:ForceDirectedGraph,
  // set up svg elements
  init: function() {
    // allows all work to be done using same coordinates initially used
    this.aspect = this.width / this.height;
    this.width = 901;
    this.height = this.width / this.aspect;

    // no need to redraw on resize
    this.svg.attr("viewBox", "0 0 " + this.width + " " + this.height);

    // background color
    this.svg.append("rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("padding", "20px")
      .style("fill", "#444");

    this.svg.call(d3.zoom()
        .scaleExtent([1 / 2, 4])
        .on("zoom", this.zoomed.bind(this)));

    // init containers for legend and slider
    var container = d3.select("#forceDirectedDiv").append("div")
        .attr("id", "legendContainer");

    // colors from 
    // http://colorbrewer2.org/#type=diverging&scheme=RdYlGn&n=9


    // stroke gradients
    var defs = this.svg.append('defs');

    // #fee08b
    // #fdae61
    // #f46d43
    // #d73027

    var red = defs.append('linearGradient')
        .attr('id','redLeft')
        .attr('x1',1)
        .attr('y1',0)
        .attr('x2',0)
        .attr('y2',0)
    
    red.append('stop')
        .attr('offset','0%')
        .attr('stop-color','#fee08b');
    red.append('stop')
        .attr('offset','33%')
        .attr('stop-color', "#fdae61");
    red.append('stop')
        .attr('offset','66%')
        .attr('stop-color','#f46d43');
    red.append('stop')
        .attr('offset','100%')
        .attr('stop-color', "#d73027");


    // #d9ef8b
    // #a6d96a
    // #66bd63
    // #1a9850

    var green = defs.append('linearGradient')
        .attr('id','greenLeft')
        .attr('x1',1)
        .attr('y1',0)
        .attr('x2',0)
        .attr('y2',0)

    green.append('stop')
        .attr('offset','0%')
        .attr('stop-color','#d9ef8b');
    green.append('stop')
        .attr('offset','33%')
        .attr('stop-color', "#a6d96a");
    green.append('stop')
        .attr('offset','66%')
        .attr('stop-color','#66bd63');
    green.append('stop')
        .attr('offset','100%')
        .attr('stop-color', "#1a9850");


    defs.append('linearGradient')
        .attr('id','redRight')
        .attr('xlink:href','#redLeft')
        .attr('x1',0)
        .attr('x2',1)
    defs.append('linearGradient')
        .attr('id','redUp')
        .attr('xlink:href','#redLeft')
        .attr('x1',0)
        .attr('y1',1)
    defs.append('linearGradient')
        .attr('id','redDown')
        .attr('xlink:href','#redLeft')
        .attr('x1',0)
        .attr('y2',1)
    defs.append('linearGradient')
        .attr('id','greenRight')
        .attr('xlink:href','#greenLeft')
        .attr('x1',0)
        .attr('x2',1)
    defs.append('linearGradient')
        .attr('id','greenUp')
        .attr('xlink:href','#greenLeft')
        .attr('x1',0)
        .attr('y1',1)
    defs.append('linearGradient')
        .attr('id','greenDown')
        .attr('xlink:href','#greenLeft')
        .attr('x1',0)
        .attr('y2',1)

    this.clusterCircleGroup = this.svg.append("g")
      .attr("class", "clusterGroup");
    this.linkGroup = this.svg.append("g")
      .attr("class", "linkGroup");
    this.nodeGroup = this.svg.append("g")
      .attr("class", "nodeGroup")

    this._isDragging = false;

    /* Initialize tooltip for nodes */
    this.tip = d3.select('#forceDirectedDiv').append('div')
        .style('opacity',0)
        .style('position','absolute')
        .style('left',0)
        .style('top',0)
        .style('font-size', '0.85em')
        .style('padding','1vmin 1.5vmin')
        .style('border-radius','0 0 8px 0')
        .style('background', 'rgba(30,30,30,0.8)')
        .style('color','white')
        .style('letter-spacing','0.1vmin')
        .style('pointer-events','none');
  },
  resize:function() {
    var rect = this.svg.node().parentNode.getBoundingClientRect();
    if (rect.width && rect.height) {
      this.width = rect.width,
      this.height = rect.height;
    }

    this.svg
      .attr('width', this.width)
      .attr('height', this.height)

    this.aspect = this.width / this.height;
    this.width = 901;
    this.height = this.width / this.aspect;

    this.svg.attr("viewBox", "0 0 " + this.width + " " + this.height);

    this.svg.select('rect')
      .attr('width', this.width)
      .attr('height', this.height)

    var containerWidth = this.svg.node().parentNode.getBoundingClientRect().width;

    this.legend.container
        .style("width", containerWidth + "px");

    // reheat simulation
    if (this.simulation) {
      this.simulation
        .force("center", d3.forceCenter(
          (this.width / 2),
          (this.height / 2)
          ));

      this.simulation.alpha(0.3).restart();
    }
  },
  zoomed: function() {
    var transform = d3.event.transform;
    this.nodeGroup.attr("transform", transform);
    this.linkGroup.attr("transform", transform);
    this.clusterCircleGroup.attr("transform", transform);
  },
  showTip: function(d, type) {
    this.tip.selectAll('*').remove();
    this.tip.transition().style('opacity',1);

    var self = this;
    function adjustedClusterColor(cluster) {
      var color = d3.hsl(self.clusterColor(cluster))
      if (color.l < 0.65) { color.l = 0.65 }
      return color.toString();
    }

    if (type === 'rule') {
      var sp = this.tip.append('span')
          .text('Rule: ');

      sp.append('span')
          .style('letter-spacing',0)
          .style('font-weight','bold')
          .style('color', adjustedClusterColor(d.cluster))
          .text(d.name);
      sp.append('br');

      sp = sp.append('div')
        .style('font-size','0.85em')
        .style('line-height','1.4em')
        .style('padding-left','0.5vw')
        .style('border-left','0.1vw dotted #ccc');

      sp.append('span')
        .text('Hits: ' + d.hits);

      var selfInf = d.inf.filter(inf => inf.name === d.name);
      var inf = d.inf.filter(inf => inf.name !== d.name)
                  .sort((a,b) => Math.abs(b.flux) - Math.abs(a.flux) );
      var outf = d.outf.filter(outf => outf.name !== d.name)
                  .sort((a,b) => Math.abs(b.flux) - Math.abs(a.flux) );
      var selfCluster = d.cluster;
      var num;

      function adjustedClusterColor(cluster) {
        var color = d3.hsl(self.clusterColor(cluster))
        if (color.l < 0.65) { color.l = 0.65 }
        return color;
      }

      var self = this;
      if (selfInf.length > 0) {
        num = App.property.sci ?
            Number(selfInf[0].flux.toPrecision(3)).toExponential() :
            Number(selfInf[0].flux.toFixed(3))
        sp.append('br');
        sp.append('span')
          .text('Self-influence: ')
          .style('color', function() {
            return adjustedClusterColor(selfCluster);
          })       
      sp.append('span')
          .text(num)
          .style('color', function() {
              return num < 0 ? '#f66' : '#4c4';
            });
      }
      if (inf.length > 0) {
        sp.append('br');
        sp.append('span')
          .text('Influence on...');
        inf.slice(0,10).forEach(flux => {
          num = App.property.sci ?
            Number(flux.flux.toPrecision(3)).toExponential() :
            Number(flux.flux.toFixed(3))

          sp.append('br');
          sp.append('span')
            .text(flux.name + ': ')
            .style('margin-left','0.75vw')
            .style('font-weight','bold')
            .style('color', function() {
              var cluster = self.findCluster(flux.name);
              return adjustedClusterColor(cluster);
            });
          sp.append('span')
          .text(num)
          .style('color', function() {
              return num < 0 ? '#f66' : '#4c4';
            });
        })
  
        if (inf.length > 10) {
          sp.append('br');
          sp.append('span')
            .text('...and ' + (inf.length-10) + ' more')
            .style('margin-left','0.75vw');
        }
      }
      if (outf.length > 0) {
        sp.append('br');
        sp.append('span')
          .text('Influenced by...');

        outf.slice(0,10).forEach(flux => {
          num = App.property.sci ?
            Number(flux.flux.toPrecision(3)).toExponential() :
            Number(flux.flux.toFixed(3))

          sp.append('br');
          sp.append('span')
            .text(flux.name + ': ')
            .style('margin-left','0.75vw')
            .style('font-weight','bold')
            .style('color', function() {
              var cluster = self.findCluster(flux.name);
              return adjustedClusterColor(cluster);
            });
          sp.append('span')
          .text(num)
          .style('color', function() {
              return num < 0 ? '#f66' : '#4c4';
            });
        })

        if (outf.length > 10) {
          sp.append('br');
          sp.append('span')
            .text('...and ' + (outf.length-10) + ' more')
            .style('margin-left','0.75vw');
        }
      }
    }
    else {
      var cs = d3.hsl(this.clusterColor(d.source.cluster));
      var ct = d3.hsl(this.clusterColor(d.target.cluster));
      if (cs.l < 0.65) { cs.l = 0.65 }
      if (ct.l < 0.65) { ct.l = 0.65 }

      var sp = this.tip.append('span');
      sp.text('Influence: ')
        .append('span').text(App.property.sci ?
            Number(d.value.toPrecision(3)).toExponential() :
            Number(d.value.toFixed(3)) )
          .style('font-weight','bold')
          .style('color', d.value < 0 ? '#f66' : '#4c4');
      sp.append('br');
      sp.append('span')
          .text(d.source.name)
          .style('letter-spacing',0)
          .style('font-weight','bold')
          .style('color', cs.toString());
      sp.append('br');
      sp.append('text').text('on ');
      sp.append('span')
          .text(d.target.name)
          .style('letter-spacing',0)
          .style('font-weight','bold')
          .style('color', ct.toString());
    }

  },
  hideTip: function() {
    this.tip.transition().style('opacity',0);
  },

  // process data into nodes & links where links have magnitude > 0
  filterData: function(data) {
    var filteredData = {};
    var links = [];

    for (var key in data) {
      var newNode = {
        hits: data[key].hits,
        name: data[key].name,
        inf: data[key].inf.filter(l => l.flux !== 0),
        outf: data[key].outf.filter(l => l.flux !== 0)
      }

      newNode.inf.forEach(l => {
        links.push({
          source: key,
          target: l.name,
          value: l.flux
        });
      })

      if (newNode.inf.length > 0 || newNode.outf.length > 0) {
        filteredData[key] = newNode;
      }
    }

    this.filteredData = filteredData,
    this.links = links;
  },

  // cluster data based on threshold(s) of influence
  defineClusters: function(threshold, alpha) {
    if (threshold) {
      this.threshold = threshold;
    } else {
      threshold = this.threshold;
    }
    if (App.infSlider) { App.infSlider.setPosition(threshold); }

    var clusters = [];
    var data = this.filteredData;

    // clear clusters
    for (var n in data) {
      data[n].cluster = undefined;
    }

    this.links.forEach(link => {
      if (Math.abs(link.value) >= threshold) {
        var source = data[link.source] || link.source,
            target = data[link.target] || link.target,
            sc = source.cluster,
            tc = target.cluster;

        if (source === target) { return; } // ignore self influencing nodes?

        // create a new cluster
        if (sc == undefined && tc == undefined) {
          source.cluster = target.cluster = clusters.length;
          clusters.push([source, target])
        }
        // already in a cluster
        else if (sc !== tc) {
          if (sc == undefined) {
            source.cluster = tc;
            if (clusters[tc].indexOf(source) < 0) clusters[tc].push(source);
          }
          else if (tc == undefined) {
            target.cluster = sc;
            if (clusters[sc].indexOf(target) < 0) clusters[sc].push(target);
          }
          else {
            // join source cluster to target cluster
            clusters[tc].forEach(n => n.cluster = sc);
            clusters[sc] = clusters[sc].concat(clusters[tc]);
            clusters[tc] = [];
          }
        }
      }
    });

    // filter out null clusters & re-index
    clusters = [[]].concat(clusters.filter(cluster => cluster.length > 0));
    for (var n in data) {
      if (data[n].cluster == undefined) {
        clusters[0].push(data[n]);
      }
    }
    clusters.forEach((cluster,i) => {
        cluster.forEach(n => {
          n.cluster = i;
        });
        cluster.sort((a,b) => b.hits - a.hits);
      });
    this.clusters = clusters;
    if (this.simulation && alpha !== 0) {
      this.simulation.alpha(alpha || 0.15).restart();
    }
  },

  // update function
  drawGraph: function() {
    this.drawClusters();
    this.drawNodes();
    this.drawLinks();
    this.createForceLayout();
  },

  drawClusters: function() {
    // console.log("drawClusters");
    let clusters = this.clusters.filter(c => c.length);
    let filteredData = this.filteredData;
    var radiusScale = d3.scaleLinear()
      .domain(d3.extent(Object.keys(filteredData), (d) => {
        return filteredData[d].hits;
      }))
      .range([4, 14]);

    var self = this;

    var circles = this.clusterCircleGroup.selectAll(".clusterCircle").data(clusters);

    circles.exit().remove();

    circles.style("fill", (d) => {
      return d[0].cluster !== 0 ? self.clusterColor(d[0].cluster) : "none";
    })
    .style("stroke", (d) => {
      return d[0].cluster !== 0 ? self.clusterColor(d[0].cluster) : "none";
    });

    circles
    .enter().append("circle")
      .attr("class", "clusterCircle")
      .style("fill", (d) => {
        return d[0].cluster !== 0 ? self.clusterColor(d[0].cluster) : "none";
      })
      .style("stroke", (d) => {
        return d[0].cluster !== 0 ? self.clusterColor(d[0].cluster) : "none";
      })
      .style("stroke-dasharray", "2, 2")
      .style("fill-opacity", 0.3)
      .call(d3.drag()
        .on('start', function(d) { 
          if (!d3.event.active) {
            self.simulation.alphaTarget(0.3).restart();
          }
          d.forEach((n) => {
            n._fixed = (n.fx != null);
            n.fx = n.x;
            n.fy = n.y;
          })
        })
        .on('drag', function(d) { 
          d.forEach((n) => {
            n.fx += d3.event.dx;
            n.fy += d3.event.dy;
          })
        })
        .on('end', function(d) { 
          if (!d3.event.active) {
            self.simulation.alphaTarget(0);
          }
          d.forEach((n) => {
            if (!n._fixed) {
              n.fx = n.fy = null;
            }
          })
        }) );
  },

  // draw nodes
  drawNodes: function() {
    var filteredData = this.filteredData;
    var radiusScale = d3.scaleLinear()
      .domain(d3.extent(Object.keys(filteredData), (d) => {
        return filteredData[d].hits;
      }))
      .range([4, 14]);

    // scale nodes by # of hits
    for (var key in filteredData) {
      filteredData[key].radius = radiusScale(filteredData[key].hits);
      filteredData[key].x = filteredData[key].x || this.width / 2;
      filteredData[key].y = filteredData[key].y || this.height / 2;
    }

    // define dragging behavior
    var self = this;
    var drag = d3.drag()
        .on('start', function(d) {
          if (!d3.event.active) {
            self.simulation.alphaTarget(0.3).restart();
          }
        })
        .on('drag', function(d) {
          self._isDragging = true;
          d3.select(this)
            .style("fill", self.clusterColor(d.cluster))
            .style("stroke", "#404040");
          d.fx = d3.event.x,
          d.fy = d3.event.y;
        })
        .on('end', function(d) {
          self._isDragging = false;
          if (!d3.event.active) {
            self.simulation.alphaTarget(0);
          }
        });

    var rule = this.nodeGroup.selectAll(".rule-node")
        .data(Object.keys(filteredData).map(d => filteredData[d]));

    var text = this.nodeGroup.selectAll(".rule-text")
        .data(Object.keys(filteredData).map(d => filteredData[d]));

    
    rule.enter().append("circle")
      .attr("class", "rule rule-node")
      .attr("transform", (d, i) => {
        return "translate(" + d.x + ", " + d.y + ")";
      })
      .style("stroke", "white")
      .style("stroke-opacity", 0.5)
      .style("stroke-width", 1.5)
    .merge(rule)
      .attr("cluster", d => d.cluster)
      .attr("r", d => d.radius)
      .attr("pointer-events", (d) => {
        if(App.property.node == true && d.cluster === 0) {
          return 'none';
        }
        else return 'all';
      })
      .style("opacity", (d) => {
        if( App.property.node == true && d.cluster === 0) {
          return 0;
        }
        else return 1;
      })
      .style('stroke-opacity', (d) => {
        if( App.property.node == true && d.cluster === 0) {
          return 0;
        }
        else return 0.5;
      })
      .on('mouseover', this._isDragging ? null : function(d) {

        d3.select(this)
          .style('stroke-opacity',1);
        self.showTip(d, 'rule');

        if (App.panels.topVis) { App.panels.topVis.updateRule(d); }
        if (App.panels.bottomVis) { App.panels.bottomVis.updateRule(d, true); }

        self.linkGroup.selectAll(".link-2").filter(function(target) {
          return target.source.name === d.name;
        })
          .transition()
          .style('stroke-opacity', 0.5).interrupt();
    
      })
      .on("mouseout", function() {
        d3.select(this).transition()
          .style('stroke-opacity',0.5);
        self.linkGroup.selectAll(".link-2")
          .style('stroke-opacity', 0).;
        self.hideTip();

      })
      .on('click', function(d) {
        d3.select(this)
          .style("fill", (d) => self.clusterColor(d.cluster))
          .style("stroke", "white");
        d.fx = d.fy = null;
      })
      .call(drag);

    // remove as needed
    rule.exit().remove();


    // also add text
    text.enter().append('text')
      .attr('class','rule rule-text')
      .attr('pointer-events','none')
      .attr("transform", (d, i) => {
        return "translate(" + (d.x+d.radius+2) + "," + (d.y-d.radius) + ")";
      })
      .style('font-size','14px')
      .style('letter-spacing','0.1px')
      .style('text-shadow','2px 1px 1px #333')
    .merge(text)
      .text(d => d.name)
      .style('opacity', function(d) {
        if (App.property.label == true) {
          if (App.property.node == true && d.cluster === 0) {
            return 0;
          }
          return 0.75;
        }
        else {
          return 0;
        }
      })


    text.exit().remove();
  },

  clusterColor: function(cluster) {
    if (cluster === 0) {
      return '#222';
    }

    return d3.scaleOrdinal(d3.schemeCategory20)
      .domain(d3.range(1,20))
      (cluster);
  },

  findCluster: function(name) {
    var filteredData = App.panels.forceDirected.filteredData;
    for (var key in filteredData) {
      if (filteredData[key].name === name) {
        return filteredData[key].cluster;
      }
    }
    return 0;
  },

  drawLinks: function() {
    var strokeScale = d3.scaleQuantile()
      .domain(this.links.map(d => Math.abs(d.value)))
      .range(d3.range(0.4, this.links.length > 200 ? 1 : 4, 0.05));

   // var inflToggle = d3.selectAll("#infl-link");
    var threshold = Math.abs(App.panels.forceDirected.threshold);
    var mainLink = this.linkGroup.selectAll('.link-1')
      .data(this.links)

   mainLink
      .style('stroke-opacity', (d) => {
        if(App.property.green == true && App.property.red == true) {
          return 0;
        }
        else if( App.property.green == true && d.value > 0 ) {
          return 0;
        }
        else if( App.property.red == true && d.value < 0) {
          return 0;
        }
        else if( App.property.link == true && Math.abs(d.value) < threshold) {
          return 0;
        }
        else { 
          return 1;
        }
      });

    mainLink.exit().remove();
    mainLink.enter().append('path')
        .attr('class', 'link link-1')
        .attr('fill','none')
        .attr('pointer-events','none')
      .merge(mainLink)
        .attr("value", d => d.value)
        .style("stroke-width", (d) => {
          return strokeScale(Math.abs(d.value));
        });

    // invisible line for collisions
    var self = this;
    var hoverLink = this.linkGroup.selectAll('.link-2')
      .data(this.links);

   hoverLink
      .attr('pointer-events', (d) => {
        if(App.property.green == true && 
           App.property.red == true) {
          return 'none';
        }
        else if(App.property.green == true && d.value > 0) {
          return 'none';
        }
        else if( App.property.red == true && d.value < 0) {
          return 'none';
        }
        else if( App.property.link == true && Math.abs(d.value) < threshold) {
          return 'none';
        }
        else { 
          return 'all';
        }
      });

    hoverLink.exit().remove();
    hoverLink.enter().append('path')
        .attr("class", "link link-2")
        .attr('fill','none')
        .attr("value", d => d.value)
        .style("stroke-opacity", 0)
        .style("stroke-width", 8)
        .on("mouseover", (d, i) => {
          if (self._isDragging) return;
          d3.select(d3.event.target)
            .style('stroke-opacity',0.5);
          self.showTip(d, 'path');
        })
        .on("mouseout", (d, i) => {

          d3.select(d3.event.target)
            .transition()
            .style('stroke-opacity',0);
          self.hideTip();
        });
  },


  // the big workhorse of the simulation ???
  createForceLayout: function() {
    var data = this.filteredData,
        nodeArr = Object.keys(data).map(n => data[n]);

    var radiusScale = d3.scaleLinear()
      .domain(d3.extent(Object.keys(data), (d) => {
        return data[d].hits;
      }))
      .range([4, 14]);

    var borderNodeMargin = 10;

    var self = this;
    this.simulation
      .nodes(nodeArr)
      .on("tick", tick);

    // modify the appearance of the nodes and links on tick
    var node = this.nodeGroup.selectAll(".rule");
    var link = this.linkGroup.selectAll(".link");

    var cluster = this.clusterCircleGroup.selectAll(".clusterCircle");

    function tick() {
        node
          .datum((d) => {

            var clampX = d3.scaleLinear()
              .domain([16 + borderNodeMargin, self.width - 36 - borderNodeMargin])
              .range([16 + borderNodeMargin, self.width - 36 - borderNodeMargin])
              .clamp(true);

            var clampY = d3.scaleLinear()
              .domain([16 + borderNodeMargin, self.height - 56 - borderNodeMargin])
              .range([16 + borderNodeMargin, self.height - 56 - borderNodeMargin])
              .clamp(true);

            d.x = clampX(d.x);
            d.y = clampY(d.y);
            return d;
          })
          .style("fill", (d,i,el) => {
            return (d3.select(el[i]).classed('rule-text')) ?
              'white' : self.clusterColor(d.cluster);
          })
          .attr("transform", (d,i,el) => {
            return (d3.select(el[i]).classed('rule-text')) ?
              "translate(" + (d.x+d.radius+2) + "," + (d.y-d.radius) + ")" :
              "translate(" + d.x + "," + d.y + ")";
          });

        link
          .style("stroke", (d) => {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y;
            if (d.value > 0) {
              if (Math.abs(dy/dx) > 3) {
                return dy < 0 ? "url(#greenUp)" : "url(#greenDown)";
              }
              return dx < 0 ? "url(#greenLeft)" : "url(#greenRight)";
            }
            else {
              if (Math.abs(dy/dx) > 3) {
                return dy < 0 ? "url(#redUp)" : "url(#redDown)";
              }
              return dx < 0 ? "url(#redLeft)" : "url(#redRight)";
            }
          })
          .attr('d', createArrowPath);

        self.clusterCircleGroup.selectAll(".clusterCircle")
          .attr("cx", (d) => {
            var ext = d3.extent(d, node => node.x);
            if (isNaN(ext[0])  || isNaN(ext[1])) {
              console.log(d);
            }

            return (ext[1] + ext[0]) / 2;
          })
          .attr("cy", (d) => {
            var ext = d3.extent(d, node => node.y);
            if (isNaN(ext[0])  || isNaN(ext[1])) {
              console.log(d);
            }

            return (ext[1] + ext[0]) / 2;
          })
          .attr("r", function(d) {
            var x = Number(d3.select(this).attr("cx"));
            var y = Number(d3.select(this).attr("cy"));

            var circlePadding = 15;

            var radius = d3.max(d, (node) => {
              return Math.sqrt(Math.pow((node.x - x), 2) + Math.pow((node.y - y), 2))
                + radiusScale(node.hits);
            });

            if (isNaN(radius)) {
              console.log(d);
            }

            return radius + circlePadding;
          });
    }

    function createArrowPath(d) {
      var target = d.target,
          source = d.source;

      var dx = target.x - source.x,
          dy = target.y - source.y,
          dr = Math.sqrt(dx * dx + dy * dy)*2;

      if (dr == 0) { return ""; }

      var nx = -dx / dr,
          ny = -dy / dr;

      if (dr < 100) { dr /= 2; }

      var t = {
        x: target.x + (target.radius+3)*nx,
        y: target.y + (target.radius+3)*ny
      };

      if (this.classList.contains('link-1')) {
        return  "M" + source.x + "," + source.y +
                "A" + dr + "," + dr + " 0 0,1 " +
                t.x + "," + t.y;
      }
      else {
        nx *= 8, ny *= 8;
        t.x += nx, t.y += ny;

        return  "M" + source.x + "," + source.y +
              "A" + dr + "," + dr + " 0 0,1 " +
              t.x + "," + t.y+
              "m" + (2*nx-ny) + ',' + (2*ny+nx) +
              "L" + t.x + "," + t.y+
              "l" + (2*nx+ny) + ',' + (2*ny-nx);
      }
    }


    // simulation forces
    this.simulation.force("link")
        .links(this.links)
        .distance((d) => {

          let strengthScale = d3.scaleLinear()
            .domain([0, self.maxInfl])
            .range([1,0.4])
            .clamp(true);

          if (d.value < 0) {
            return 25/strengthScale(-d.value);
          }
          else {
            return 25*strengthScale(d.value);
          }
        })
        .strength((d) => {
          let strengthScale = d3.scaleLinear()
            .domain([0, self.maxInfl])
            .range([0.3,1])
            .clamp(true);

          var multiplier = strengthScale(Math.abs(d.value));

          var cs = d.source.inf.length + d.source.outf.length,
              ct = d.target.inf.length + d.target.outf.length;
          return multiplier/Math.max(1,Math.min(cs, ct));
        });

    this.simulation.force("cluster", clustering)
                   // .force("collide", collide);


    // Initial clustering forces:
    var self = this;
    function clustering(alpha) {
        var clusters = self.clusters;
        nodeArr.forEach(function(d) {
          if (d.cluster > 0) {
            var cluster = clusters[d.cluster][0];
            if (cluster === d) return;
            var x = d.x - cluster.x,
                y = d.y - cluster.y,
                l = Math.sqrt(x * x + y * y),
                r = d.radius + cluster.radius;
            if (x === 0 && y === 0 || (isNaN(x) || isNaN(y))) return;
            if (l !== r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              cluster.x += x;
              cluster.y += y;
            }
          }
        });
    }

      function collide(alpha) {
        var padding = 1.5;
        var clusterPadding = 6; // separation between different-color circles
        var maxRadius = 20;
        var quadtree = d3.quadtree()
            .x((d) => d.x)
            .y((d) => d.y)
            .addAll(nodeArr);

        nodeArr.forEach(function(d) {
          var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
              nx1 = d.x - r,
              nx2 = d.x + r,
              ny1 = d.y - r,
              ny2 = d.y + r;
          quadtree.visit(function(quad, x1, y1, x2, y2) {

            if (quad.data && (quad.data !== d)) {
              var x = d.x - quad.data.x,
                  y = d.y - quad.data.y,
                  l = Math.sqrt(x * x + y * y),
                  r = d.r + quad.data.radius + (d.cluster === quad.data.cluster ? padding : clusterPadding);
              if (l < r) {
                l = (l - r) / l * alpha;
                d.x -= x *= l;
                d.y -= y *= l;
                quad.data.x += x;
                quad.data.y += y;
              }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
          });
        });
      }
  }, // end createForceLayout

  // to be called externally: change the source data
  updateData:function(data) {
    if (data) { App.data = data; }

    // reprocess and cluster data
    this.simulation.stop();
    var oldData = this.filteredData;
    this.filterData(App.data);

    for (var key in this.filteredData) {
      if (oldData[key]) {
        this.filteredData[key].x = oldData[key].x;
        this.filteredData[key].y = oldData[key].y;
        this.filteredData[key].fx = oldData[key].fx;
        this.filteredData[key].fy = oldData[key].fy;
      }
    }

    this.maxInfl = d3.max(this.links, d => Math.abs(d.value));
    this.defineClusters(this.threshold, 0);
    this.drawGraph();
    this.simulation.alpha(0.001).restart();
  },

  createLegend:function() {
    var self = this;

    var containerWidth = d3.select("#forceDirectedDiv").node().getBoundingClientRect().width;

    this.legend.container = d3.select("#legendContainer")
        .style("width", containerWidth + "px");

    this.legend.aspect = 183 / 265;
    this.legend.height = this.legend.container.node().getBoundingClientRect().height * 0.4;
    this.legend.width = this.legend.height * this.legend.aspect;

    // var divPeekWidth = (this.legend.width / 8);
    var peekWidth = (183 / 8);

    this.legend.pinned = false;
    
    this.legend.div = this.legend.container
      .append("div")
      .attr("id", "legend")
      .style("width", this.legend.width + "px")
      .style("height", this.legend.height + "px") 
      .style("right", (this.legend.width / 8) - this.legend.width + "px")
      .on("click", function() {
        self.legend.pinned = !self.legend.pinned;

        if(self.legend.pinned) {
          d3.select(this)
            .style("border", "2px solid #74add1")
            .style("background-color", "rgba(25,25,25,0.9)");

          self.legend.svg.select(".arrow1").transition().duration(250)
            .style("opacity", 0);

          self.legend.svg.select(".arrow2").transition().duration(250)
            .style("opacity", 0);
        } else {
          d3.select(this)
            .style("border", "none")
            .style("background-color", "rgba(25,25,25,0.75)");

          self.legend.svg.select(".arrow1").transition().duration(250)
            .style("opacity", 1);

          self.legend.svg.select(".arrow2").transition().duration(250)
            .style("opacity", 1);
        }
        
      })
      .on("mouseover", function() {
        if (!self.legend.pinned){
          d3.select(this).transition().duration(500)
          .style("right", "5px")
          .style("background-color", "rgba(25,25,25,0.75)");

          self.legend.svg.select(".peekBar")
            .style("opacity", 0);

          self.legend.svg.select(".arrow1").transition().duration(500)
            .attr("transform", "translate(" + peekWidth/3 + "," + peekWidth / 4 + ")");

          self.legend.svg.select(".arrow2").transition().duration(500)
            .attr("transform", "translate(" + (peekWidth/3) + "," + (265 - 3 * peekWidth/4) + ")");
        }
      })
      .on("mouseout", function() {
        if (!self.legend.pinned){
          d3.select(this).transition().duration(250)
            .style("right", (self.legend.width / 8) - self.legend.width + "px")
            .style("background-color", "rgba(25,25,25,0)");

          self.legend.svg.select(".peekBar").transition().duration(10).delay(250)
          .style("opacity", 0.25);

          self.legend.svg.select(".arrow1").transition().duration(250)
            .attr("transform", "translate(" + (2 * peekWidth/3) + "," + (3 * peekWidth / 4) + ") rotate(180)");

          self.legend.svg.select(".arrow2").transition().duration(250)
            .attr("transform", "translate(" + (2 * peekWidth/3) + "," + (265 - peekWidth/4) + ") rotate(180)");
        }
      });


    this.legend.width = this.legend.div.node().getBoundingClientRect().width;
    this.legend.height = this.legend.div.node().getBoundingClientRect().height;

    this.legend.svg = this.legend.div
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("pointer-events", "none")
      .style("font-family", "Helvetica, sans-serif");

    this.legend.svg
      .attr("viewBox", "0 0 183 265");


    var defs = this.legend.svg.append("defs"); 

    var red = defs.append('linearGradient')
        .attr('id','redLgd')
        .attr('x1',0)
        .attr('y1',0)
        .attr('x2',1)
        .attr('y2',0);

    red.append('stop')
      .attr('offset','0%')
      .attr('stop-color','#fee08b');
    red.append('stop')
      .attr('offset','33%')
      .attr('stop-color', "#fdae61");
    red.append('stop')
      .attr('offset','66%')
      .attr('stop-color','#f46d43');
    red.append('stop')
      .attr('offset','100%')
      .attr('stop-color', "#d73027");


    var green = defs.append('linearGradient')
        .attr('id','greenLgd')
        .attr('x1',0)
        .attr('y1',0)
        .attr('x2',1)
        .attr('y2',0);

    green.append('stop')
      .attr('offset','0%')
      .attr('stop-color','#d9ef8b');
    green.append('stop')
      .attr('offset','33%')
      .attr('stop-color', "#a6d96a");
    green.append('stop')
      .attr('offset','66%')
      .attr('stop-color','#66bd63');
    green.append('stop')
      .attr('offset','100%')
      .attr('stop-color', "#1a9850");


    var peekCoords = [
      [0, 0],
      [0, peekWidth],
      [3 * peekWidth/4, peekWidth],
      [3 * peekWidth/4, 265 - peekWidth],
      [0, 265 - peekWidth],
      [0, 265],
      [peekWidth, 265],
      [peekWidth, 0]
    ];

    // draw arrow background
    this.legend.svg
      .append("path")
      .attr("class", "peekBar")
      .attr("d", "M " + peekCoords.map(el => el.join(",")).join("L") + "Z")
      .style("opacity", 0.25);

    // draw arrows to pull out and push in
    this.legend.svg
      .append("path")
      .attr("class", "arrow1")
      .attr("transform", "translate(" + (2 * peekWidth/3) + "," + (3 * peekWidth / 4) + ") rotate(180)")
      .attr("d", "M 0 0 L " + (peekWidth/3) + " " + (peekWidth/4) + " L 0 " + (peekWidth/2) + " Z")
      .style("fill", "white");

    this.legend.svg
      .append("path")
      .attr("class", "arrow2")
      .attr("transform", "translate(" + (2 * peekWidth/3) + "," + (265 - peekWidth/4) + ") rotate(180)")
      .attr("d", "M 0 0 L " + (peekWidth/3) + " " + (peekWidth/4) + " L 0 " + (peekWidth/2) + " Z")
      .style("fill", "white");

    // now make legend in this section
    var margin = {
      left: peekWidth + 2,
      right: peekWidth + 2,
      top: peekWidth + 2,
      bottom: peekWidth + 2
    };

    // legend title
    this.legend.svg.append("text")
      .attr("class", "legendTitle")
      .text("Legend")
      .attr("x", 183/2)
      .attr("y", 20)
      .style("font-size", "14px")
      .style("fill", "white")
      .style("text-anchor", "middle")
      .style("font-weight", "bold");

    // node size scale
    var hitsDomain = this.legend.nodeSizeDomain;
    var radiusRange = this.legend.nodeSizeRange;
    var nodeCircleTop = 25 + radiusRange[1];

    var backgroundCoords = [
      [(margin.left + radiusRange[0]), nodeCircleTop + radiusRange[1]],
      [183 - margin.right - radiusRange[1], nodeCircleTop + radiusRange[1]],
      [183 - margin.right - radiusRange[1], nodeCircleTop - radiusRange[1]],
      [(margin.left + radiusRange[0]), nodeCircleTop + radiusRange[1] - 2*radiusRange[0]]
    ];

    nodeSizeGroup = this.legend.svg.append("g")
      .attr("class", "legendNodeSizeG")
      .attr("transform", "translate(0, 22)");

    nodeSizeGroup.append("text")
      .attr("class", "legendNodeSize")
      .text("Rule # Hits")
      .attr("x", 183/2)
      .attr("y", 20)
      .style("fill", "white")
      .style("font-size", "12px")
      .style("text-anchor", "middle");

    // background of circles
    nodeSizeGroup.append("path")
      .attr("class", "legendNodeSize")
      .attr("d", "M " + backgroundCoords.map(c => c.join(",")).join("L") + "Z")
      .style("stroke", "white")
      .style("fill", self.clusterColor(1))
      .style("opacity", 0.25);

    // left circle
    nodeSizeGroup.append("circle")
      .attr("class", "legendNodeSize")
      .attr("cx", margin.left + radiusRange[0])
      .attr("cy", nodeCircleTop + radiusRange[1] - radiusRange[0])
      .attr("r", radiusRange[0])
      .style("fill", self.clusterColor(1))
      .style("stroke", "white");

    // right circle
    nodeSizeGroup.append("circle")
      .attr("class", "legendNodeSize")
      .attr("cx", 183 - margin.right - radiusRange[1])
      .attr("cy", nodeCircleTop)
      .attr("r", radiusRange[1])
      .style("fill", self.clusterColor(1))
      .style("stroke", "white");

     // left label
     nodeSizeGroup.append("text")
      .attr("class", "legendNodeSize")
      .text(hitsDomain[0])
      .attr("x", margin.left)
      .attr("y", nodeCircleTop + radiusRange[1] + 12)
      .style("fill", "white")
      .style("font-size", "10px")
      .style("text-anchor", "start");

     // right label 
     nodeSizeGroup.append("text")
      .attr("class", "legendNodeSize")
      .text(hitsDomain[1])
      .attr("x", 183 - margin.right)
      .attr("y", nodeCircleTop + radiusRange[1] + 12)
      .style("fill", "white")
      .style("font-size", "10px")
      .style("text-anchor", "end");


    // node coloring
    var numNodeCircles = 6;
    var nodeCircleMargin = 7;
    var nodeCircleSpacing = (183 - margin.left - margin.right) / numNodeCircles;
    var nodeCircleRadius = (183 - margin.left - margin.right - (nodeCircleMargin * (numNodeCircles - 1))) / (2 * numNodeCircles);

    var nodeColorGroup = this.legend.svg.append("g")
      .attr("class", "legendNodeColorG")
      .attr("transform", "translate(0, 88)");

    nodeColorGroup.append("text")
      .text("Rule Cluster")
      .attr("x", 183/2)
      .attr("y", 20)
      .style("fill", "white")
      .style("font-size", "12px")
      .style("text-anchor", "middle");

    nodeColorGroup.selectAll(".legendNodeColor")
      .data(d3.range(numNodeCircles))
    .enter().append("circle")
      .attr("class", "legendNodeColor")
      .attr("cx", (d, i) => margin.left + (i * nodeCircleSpacing) + nodeCircleRadius)
      .attr("cy", nodeCircleTop)
      .attr("r", nodeCircleRadius)
      .style("fill", (d, i) => self.clusterColor(i + 1))
      .style("stroke", "white");

    // link color/direction
    var linkColorGroup = this.legend.svg.append("g")
      .attr("class", "legendLinkColorG")
      .attr("transform", "translate(0, 146)");
    
    linkColorGroup.append("text")
      .attr("class", "legendLinkColor")
      .text("Link Color")
      .attr("x", 183/2)
      .attr("y", 20)
      .style("fill", "white")
      .style("font-size", "12px")
      .style("text-anchor", "middle");

    // positive
    linkColorGroup.append("rect")
      .attr("class", "legendLinkColor")
      .attr("x", (margin.left + 10))
      .attr("y", 27)
      .attr("width", (183-margin.right-margin.left-10))
      .attr("height", 5)
      .style("fill", "url(#greenLgd)");

    linkColorGroup.append("text")
      .attr("class", "legendLinkColor")
      .text("+")
      .attr("x", margin.left + 5)
      .attr("y", 35)
      .style("fill", "white")
      .style("font-size", "12px")
      .style("text-anchor", "middle");

    // negative
    linkColorGroup.append("rect")
      .attr("class", "legendLinkColor")
      .attr("x", (margin.left + 10))
      .attr("y", 39)
      .attr("width", (183-margin.right-margin.left-10))
      .attr("height", 5)
      .style("fill", "url(#redLgd)");

    linkColorGroup.append("text")
      .attr("class", "legendLinkColor")
      .text("-")
      .attr("x", margin.left + 5)
      .attr("y", 47)
      .style("fill", "white")
      .style("font-size", "12px")
      .style("text-anchor", "middle");

    // direction arrow
    linkColorGroup.append("line")
      .attr("class", "legendLinkDir")
      .attr("x1", (margin.left + 10))
      .attr("x2", (183-margin.right))
      .attr("y1", 55)
      .attr("y2", 55)
      .style("stroke", "lightgray");

    linkColorGroup.append("line")
      .attr("class", "legendLinkDir")
      .attr("x1", (183-margin.right - 5))
      .attr("x2", (183-margin.right))
      .attr("y1", 60)
      .attr("y2", 55)
      .style("stroke", "lightgray");

    linkColorGroup.append("line")
      .attr("class", "legendLinkDir")
      .attr("x1", (183-margin.right - 5))
      .attr("x2", (183-margin.right))
      .attr("y1", 50)
      .attr("y2", 55)
      .style("stroke", "lightgray");

    // link width
    var linkSizeDomain = this.legend.linkSizeDomain;
    var linkSizeRange = this.legend.linkSizeRange;
    var linkTop = 25 + linkSizeRange[1];

    var linkSizeCoords = [
      [(margin.left + linkSizeRange[0]), linkTop + linkSizeRange[1]],
      [183 - margin.right - linkSizeRange[1], linkTop + linkSizeRange[1]],
      [183 - margin.right - linkSizeRange[1], linkTop - linkSizeRange[1]],
      [(margin.left + linkSizeRange[0]), linkTop + linkSizeRange[1] - 2*linkSizeRange[0]]
    ];

    var linkSizeGroup = this.legend.svg.append("g")
      .attr("class", "legendLinkSizeG")
      .attr("transform", "translate(0, 204)");

    linkSizeGroup.append("text")
      .attr("class", "legendLinkSize")
      .text("Link Influence")
      .attr("x", 183/2)
      .attr("y", 20)
      .style("fill", "white")
      .style("font-size", "12px")
      .style("text-anchor", "middle");


    linkSizeGroup.append("path")
      .attr("class", "legendLinkSize")
      .attr("d", "M " + linkSizeCoords.map(c => c.join(",")).join("L") + "Z")
      .style("fill", "url(#greenLgd)")
      // .style("fill", "#66bd63");


    // left label
     linkSizeGroup.append("text")
      .attr("class", "legendNodeSize")
      .text(linkSizeDomain[0])
      .attr("x", margin.left)
      .attr("y", linkTop + linkSizeRange[1] + 12)
      .style("fill", "white")
      .style("font-size", "10px")
      .style("text-anchor", "start");

     // right label 
     linkSizeGroup.append("text")
      .attr("class", "legendNodeSize")
      .text(linkSizeDomain[1])
      .attr("x", 183 - margin.right)
      .attr("y", linkTop + linkSizeRange[1] + 12)
      .style("fill", "white")
      .style("font-size", "10px")
      .style("text-anchor", "end");
  }
}
