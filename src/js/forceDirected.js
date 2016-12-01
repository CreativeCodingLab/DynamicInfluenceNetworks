var App = App || {};

function ForceDirectedGraph(args) {
  Object.assign(this, args || ForceDirectedGraph.prototype)

  this.init();
  this.filterData(App.data);

  this.sortedLinks = this.links.concat().sort((a, b) => {
    return Math.abs(b.value) - Math.abs(a.value);
  });

  this.maxInfl = Math.abs(this.sortedLinks[Math.round(this.links.length/2)].value) * 2;

  var threshold = this.sortedLinks[Math.round(Math.sqrt(this.links.length))].value;
  this.defineClusters(Math.abs(threshold));

  // set up simulation
  this.simulation = d3.forceSimulation()
    .force("link",
      d3.forceLink()
        .id(d => d.name)
    )
    .force("collision", d3.forceCollide(15))
    .force("charge", d3.forceManyBody()
      .strength(-Math.pow(150, Object.keys(this.filteredData).length > 30 ? 1 : 1.2))
      .distanceMax(Math.min(this.width, this.height)/4))
    .force("center", d3.forceCenter(
      (this.width / 2),
      (this.height / 2)
    ));

  // update graph
  this.drawGraph();
};

ForceDirectedGraph.prototype = {
  // set up svg elements
  init: function() {
    // allows all work to be done using same coordinates initially used


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


    // stroke gradients
    var defs = this.svg.append('defs');
    var red = defs.append('linearGradient')
        .attr('id','redLeft')
        .attr('x1',1)
        .attr('y1',0)
        .attr('x2',0)
        .attr('y2',0)
    red.append('stop')
        .attr('offset','0%')
        .attr('stop-color','gold');
    red.append('stop')
        .attr('offset','100%')
        .attr('stop-color', "#e31a1c");

    var green = defs.append('linearGradient')
        .attr('id','greenLeft')
        .attr('x1',1)
        .attr('y1',0)
        .attr('x2',0)
        .attr('y2',0)
    green.append('stop')
        .attr('offset','0%')
        .attr('stop-color', '#09d');
    green.append('stop')
        .attr('offset','100%')
        .attr('stop-color', '#3ad01a');

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
        .style('left','15px')
        .style('top',0)
        .style('font-size', '0.85em')
        .style('padding','10px 15px')
        .style('border-radius','0 0 8px 0')
        .style('background', 'rgba(30,30,30,0.8)')
        .style('color','white')
        .style('letter-spacing','0.3px')
        .style('pointer-events','none');
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
    if (type === 'rule') {
      var color = d3.hsl(this.clusterColor(d.cluster));
      if (color.l < 0.65) { color.l = 0.65 }
      this.tip.append('span')
          .text('Rule: ')
        .append('span')
          .style('letter-spacing',0)
          .style('font-weight','bold')
          .style('color', color.toString())
          .text(d.name);
    }
    else {
      var cs = d3.hsl(this.clusterColor(d.source.cluster));
      var ct = d3.hsl(this.clusterColor(d.target.cluster));
      if (cs.l < 0.65) { cs.l = 0.65 }
      if (ct.l < 0.65) { ct.l = 0.65 }

      var sp = this.tip.append('span');
      sp.text('Influence: ')
        .append('span').text(this.svg.sci ?
            Number(d.value.toPrecision(3)).toExponential() :
            d.value.toFixed(3) )
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
      .style("fill-opacity", 0.5)
      .call(d3.drag()
        .on('start', function(d) { 
          if (!d3.event.active) {
            self.simulation.alphaTarget(0.3).restart();
          }
          d.forEach((n) => {
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
            n.fx = n.fy = null;
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

    var rule = this.nodeGroup.selectAll(".rule")
        .data(Object.keys(filteredData).map(d => filteredData[d]));

    rule.exit().remove();

    rule.enter().append("circle")
      .attr("class", "rule")
      .attr("transform", (d, i) => {
        return "translate(" + d.x + ", " + d.y + ")";
      })
      .style("stroke", "white")
      .style('stroke-opacity',0.5)
      .style("stroke-width", 1.5)
    .merge(rule)
      .attr("cluster", d => d.cluster)
      .attr("r", d => d.radius)
      .on('mouseover', this._isDragging ? null : function(d) {
        d3.select(this)
          .style('stroke-opacity',1);
        self.showTip(d, 'rule');
      })
      .on("mouseout", function() {
        d3.select(this).transition()
          .style('stroke-opacity',0.5);
        self.hideTip();
      })
      .on('click', function(d) {
        d3.select(this)
          .style("fill", (d) => self.clusterColor(d.cluster))
          .style("stroke", "white");

        d.fx = d.fy = null;
      })
      .call(drag);
  },

  clusterColor: function(cluster) {
    if (cluster === 0) {
      return '#222';
    }

    return d3.scaleOrdinal(d3.schemeCategory20)
      .domain(d3.range(1,20))
      (cluster);
  },

  drawLinks: function() {
    var strokeScale = d3.scalePow()
      .domain([0, this.maxInfl])
      .range([0.4, this.links.length > 200 ? 1 : 3])
      .clamp(true);

    var mainLink = this.linkGroup.selectAll('.link-1')
      .data(this.links)


    mainLink.exit().remove();
    mainLink.enter().append('path')
        .attr('class', 'link link-1')
        .attr('fill','none')
      .merge(mainLink)
        .attr("value", d => d.value)
        .style("stroke-width", (d) => {
          return strokeScale(Math.abs(d.value));
        });

    // invisible line for collisions
    var self = this;
    var hoverLink = this.linkGroup.selectAll('.link-2')
      .data(this.links);

    hoverLink.exit().remove();
    hoverLink.enter().append('path')
        .attr("class", "link link-2")
        .attr('fill','none')
        .attr("value", d => d.value)
        .style("stroke-opacity", 0)
        .style("stroke-width", 8)
        .on("mouseover", (d, i) => {
          if (self._isDragging) return;
          d3.select(event.target)
            .style('stroke-opacity',0.5);
          self.showTip(d, 'path');
        })
        .on("mouseout", (d, i) => {
          d3.select(event.target)
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

    var clampX = d3.scaleLinear()
      .domain([16 + borderNodeMargin, this.width - 16 - borderNodeMargin])
      .range([16 + borderNodeMargin, this.width - 16 - borderNodeMargin])
      .clamp(true);

    var clampY = d3.scaleLinear()
      .domain([16 + borderNodeMargin, this.height - 16 - borderNodeMargin])
      .range([16 + borderNodeMargin, this.height - 16 - borderNodeMargin])
      .clamp(true);

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
            d.x = clampX(d.x);
            d.y = clampY(d.y);
            return d;
          })
          .style("fill", (d) => self.clusterColor(d.cluster))
          .attr("transform", (d) => {
            return "translate(" + d.x + "," + d.y + ")";
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

          var multiplier = strengthScale(/*Math.abs*/(d.value));

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

    this.sortedLinks = this.links.concat().sort((a, b) => {
      return Math.abs(b.value) - Math.abs(a.value);
    });
    this.maxInfl = Math.abs(this.sortedLinks[Math.round(this.links.length/2)].value) * 2;
    this.defineClusters(this.threshold, 0);
    this.drawGraph();
    this.simulation.alpha(0.001).restart();
  }
}
